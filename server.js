import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyWebsocket from "@fastify/websocket";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer-core";
import bcryptjs from "bcryptjs";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_HTML_PATH = path.join(__dirname, "public", "index.html");

// Export queue to prevent too many concurrent pandoc processes
const exportQueue = {
  running: 0,
  maxConcurrent: Number(process.env.MAX_CONCURRENT_EXPORTS) || 3,
  queue: [],
  
  async execute(fn) {
    if (this.running >= this.maxConcurrent) {
      // Queue is full, wait
      await new Promise(resolve => this.queue.push(resolve));
    }
    
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
};

// Image upload configuration
const IMAGE_CONFIG = {
  MAX_SIZE_MB: Number(process.env.IMAGE_MAX_SIZE_MB || 10),
  MAX_TOTAL_PER_PASTE_MB: Number(process.env.IMAGE_MAX_TOTAL_MB || 50),
  ALLOWED_MIMES: new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]),
  ASSETS_DIR: path.join(process.env.DATA_DIR || __dirname, 'assets')
};

const STORAGE_GUARD = {
  SESSION_TTL_DAYS: Number(process.env.SESSION_TTL_DAYS) || 180,
  USER_QUOTA_MB: Number(process.env.USER_QUOTA_MB) || 50,
  DISK_WARN_PERCENT: Number(process.env.DISK_WARN_PERCENT) || 10,
  DISK_CRITICAL_PERCENT: Number(process.env.DISK_CRITICAL_PERCENT) || 5,
  MAX_PASTES_MEDIUM: Number(process.env.MAX_PASTES_MEDIUM) || 200,
  MAX_PASTES_AGGRESSIVE: Number(process.env.MAX_PASTES_AGGRESSIVE) || 50,
  MIN_FREE_MB: Number(process.env.DISK_MIN_FREE_MB) || 1024
};

const AI_PROVIDER_PRIORITY = ["groq", "gemini", "openai", "claude"];

const AI_DEFAULT_MODELS = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1",
  claude: "claude-3-7-sonnet-latest"
};

const SUPPORTED_AI_PROVIDERS = new Set(Object.keys(AI_DEFAULT_MODELS));

const getServerAiKey = (provider) => {
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || "";
  if (provider === "openai") return process.env.OPENAI_API_KEY || "";
  if (provider === "claude") return process.env.ANTHROPIC_API_KEY || "";
  return "";
};

const normalizeAiProvider = (provider) => {
  if (!provider || typeof provider !== "string") return null;
  const normalized = provider.trim().toLowerCase();
  return SUPPORTED_AI_PROVIDERS.has(normalized) ? normalized : null;
};

const getDefaultAiProvider = () => {
  const configured = normalizeAiProvider(process.env.DEFAULT_AI_PROVIDER);
  if (configured && getServerAiKey(configured)) return configured;
  for (const provider of AI_PROVIDER_PRIORITY) {
    if (getServerAiKey(provider)) return provider;
  }
  return configured || "groq";
};

const getDefaultAiModel = (provider) => {
  const configuredProvider = normalizeAiProvider(process.env.DEFAULT_AI_PROVIDER);
  if (configuredProvider === provider && process.env.DEFAULT_AI_MODEL?.trim()) {
    return process.env.DEFAULT_AI_MODEL.trim();
  }
  return AI_DEFAULT_MODELS[provider];
};

const AI_MAX_HISTORY_MESSAGES = 8;
const AI_MAX_HISTORY_CHARS = 4000;
const STATS_PAGE_ENABLED = process.env.ENABLE_STATS_PAGE === "1";

const normalizeAiHistoryContent = (role, content) => {
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);

    if (role === "user") {
      const prompt = typeof parsed?.prompt === "string" ? parsed.prompt : raw;
      const documentPreview = typeof parsed?.document === "string" && parsed.document.trim()
        ? `\nDocument excerpt:\n${parsed.document.slice(0, 500)}`
        : "";
      return `${prompt.slice(0, 800)}${documentPreview}`;
    }

    const message = typeof parsed?.message === "string" ? parsed.message : raw;
    const action = typeof parsed?.action === "string" ? `\nAction: ${parsed.action}` : "";
    return `${message.slice(0, 800)}${action}`;
  } catch {
    return raw.slice(0, 800);
  }
};

const trimAiHistory = (history) => {
  if (!Array.isArray(history) || history.length === 0) return [];

  const trimmed = [];
  let totalChars = 0;

  for (const msg of [...history].reverse()) {
    if (!msg || (msg.role !== "user" && msg.role !== "assistant")) continue;

    const content = normalizeAiHistoryContent(msg.role, msg.content);

    if (!content) continue;

    const normalized = content.length > 1000
      ? `${content.slice(0, 1000)}\n...[truncated]`
      : content;

    if (trimmed.length >= AI_MAX_HISTORY_MESSAGES) break;
    if (totalChars + normalized.length > AI_MAX_HISTORY_CHARS) break;

    trimmed.push({ role: msg.role, content: normalized });
    totalChars += normalized.length;
  }

  return trimmed.reverse();
};

const buildAiMessages = (history, inputMessage, systemPrompt) => {
  const conversation = [
    { role: "system", content: systemPrompt },
    ...trimAiHistory(history).map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
    })),
    { role: "user", content: inputMessage }
  ];

  return conversation;
};

const AI_EDIT_INTENT_PATTERN = /(schreib|erstell|erzeuge|formuliere|füge|fasse|ergänz|überarbeite|verbessere|korrigier|wandle|übersetze|generier|append|insert|prepend|replace|rewrite|summari[sz]e|summary|heading|title|add|update|edit|draft|outline|überschrift|titel|zusammenfassung|gliederung|einleitung|fazit|stichpunkte|bulletpoints|layout|seitenrand|seitenränder|seitenraender|ränder|raender|typografie|spalten|kopfzeile|fußzeile|fusszeile|header|footer|margins|columns|table of contents|inhaltsverzeichnis)/i;
const AI_CHAT_ONLY_PATTERN = /^(wer bist du|who are you|was bist du|what are you|was kannst du|what can you do|wie funktioniert|how does this work|hilfe|help|erklär|explain|warum|why|wieso|weshalb|what is|was ist|how to|wie kann ich)/i;

const shouldForceAdviceResponse = (prompt) => {
  if (typeof prompt !== "string") return false;

  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return false;

  const looksLikeQuestion = normalized.includes("?") || AI_CHAT_ONLY_PATTERN.test(normalized);
  const hasEditIntent = AI_EDIT_INTENT_PATTERN.test(normalized);

  return looksLikeQuestion && !hasEditIntent;
};

const shouldAllowDocumentChange = (prompt) => {
  if (typeof prompt !== "string") return false;
  return AI_EDIT_INTENT_PATTERN.test(prompt.trim().toLowerCase());
};

const decodeAiStringValue = (value) => String(value || "")
  .replace(/\\n/g, "\n")
  .replace(/\\r/g, "\r")
  .replace(/\\t/g, "\t")
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, "\\")
  .trim();

const salvageStructuredAiResponse = (text) => {
  const raw = String(text || "");
  const actionMatch = raw.match(/"action"\s*:\s*"([A-Z_]+)"/i);
  const messageMatch = raw.match(/"message"\s*:\s*"([\s\S]*?)"\s*,\s*"markdown"/i);
  const markdownNullMatch = raw.match(/"markdown"\s*:\s*null\s*,\s*"action"/i);
  const markdownMatch = raw.match(/"markdown"\s*:\s*"([\s\S]*?)"\s*,\s*"action"/i);

  if (!actionMatch || !messageMatch) {
    return null;
  }

  return {
    message: decodeAiStringValue(messageMatch[1]),
    markdown: markdownNullMatch ? null : decodeAiStringValue(markdownMatch?.[1] || ""),
    action: actionMatch[1].trim().toUpperCase()
  };
};

const requestOpenAiCompatibleChatCompletion = async ({ apiKey, model, messages, endpoint, providerName }) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2
    })
  });

  const raw = await response.text();
  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || raw || `${providerName} request failed`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  };

  return payload?.choices?.[0]?.message?.content || "";
};

const requestGroqChatCompletion = async ({ apiKey, model, messages }) => requestOpenAiCompatibleChatCompletion({
  apiKey,
  model,
  messages,
  endpoint: "https://api.groq.com/openai/v1/chat/completions",
  providerName: "Groq"
});

const requestGeminiChatCompletion = async ({ apiKey, model, history, inputMessage, systemPrompt }) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const chat = genAI.getGenerativeModel({ model }).startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: '{"message":"Verstanden! Ich bin bereit, dir beim Markdown-Schreiben zu helfen.","markdown":null,"action":"ADVICE"}' }] },
      ...history.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) }]
      }))
    ]
  });

  const result = await chat.sendMessage(inputMessage);
  const response = await result.response;
  return response.text();
};

const requestOpenAiChatCompletion = async ({ apiKey, model, messages }) => requestOpenAiCompatibleChatCompletion({
  apiKey,
  model,
  messages,
  endpoint: "https://api.openai.com/v1/chat/completions",
  providerName: "OpenAI"
});

const requestClaudeChatCompletion = async ({ apiKey, model, history, inputMessage, systemPrompt }) => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      max_tokens: 2500,
      temperature: 0.2,
      messages: [
        ...history.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
        })),
        { role: "user", content: inputMessage }
      ]
    })
  });

  const raw = await response.text();
  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || raw || "Claude request failed";
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return Array.isArray(payload?.content)
    ? payload.content
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
    : "";
};

const app = Fastify({
  logger: true,
  bodyLimit: 15 * 1024 * 1024  // 15 MB (base64 overhead + images)
});

// Security headers
app.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: [
        "'self'",
        "data:"
      ],
      connectSrc: [
        "'self'"
      ]
    }
  }
});

// NOTE: fastifyRateLimit is registered AFTER the session hook so that
// req.sessionId is available in the keyGenerator (onRequest hook order matters).

// Cookie secret: use ENV if set and not a known insecure default, otherwise
// load from / persist to the data directory so it survives container restarts.
const KNOWN_INSECURE = new Set(['change_me_in_production', 'changeme', 'secret', 'password']);
const COOKIE_SECRET_FILE = path.join(process.env.DATA_DIR || __dirname, '.cookie_secret');
const COOKIE_SECRET = (() => {
  const envSecret = process.env.COOKIE_SECRET;
  if (envSecret && !KNOWN_INSECURE.has(envSecret) && envSecret.length >= 32) return envSecret;
  try {
    const saved = fs.readFileSync(COOKIE_SECRET_FILE, 'utf8').trim();
    if (saved.length >= 32) return saved;
  } catch { /* file not found */ }
  const generated = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(COOKIE_SECRET_FILE, generated, { mode: 0o600 });
    app.log.info('Generated COOKIE_SECRET persisted to data directory');
  } catch (e) {
    app.log.warn({ err: e.message }, 'Could not persist COOKIE_SECRET to disk');
  }
  return generated;
})();

app.register(fastifyCookie, {
  secret: COOKIE_SECRET,
  hook: "onRequest"
});

// Register static files with a specific prefix to avoid conflicts
app.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/static/",
  decorateReply: true
});

// Register WebSocket support
app.register(fastifyWebsocket);

const nowIso = () => new Date().toISOString();

const createSession = () => {
  const id = crypto.randomUUID();
  const ts = nowIso();
  db.prepare("INSERT INTO sessions (id, created_at, last_seen) VALUES (?, ?, ?)")
    .run(id, ts, ts);
  return id;
};

const touchSession = (id) => {
  db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?")
    .run(nowIso(), id);
};

const deletePasteRelatedRecords = (pasteId) => {
  db.prepare(
    `DELETE FROM collab_chat_messages
     WHERE thread_id IN (SELECT id FROM collab_chat_threads WHERE paste_id = ?)`
  ).run(pasteId);
  db.prepare("DELETE FROM collab_chat_threads WHERE paste_id = ?").run(pasteId);
  db.prepare("DELETE FROM collab_snapshots WHERE paste_id = ?").run(pasteId);
  db.prepare("DELETE FROM collab_members WHERE paste_id = ?").run(pasteId);
  db.prepare("DELETE FROM collab_settings WHERE paste_id = ?").run(pasteId);
  db.prepare("DELETE FROM images WHERE paste_id = ?").run(pasteId);
};

// Rate limiting registered here so onRequest fires AFTER the session hook above
app.register(fastifyRateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  skipOnError: true,
  keyGenerator: (req) => req.sessionId || req.ip
});

const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365  // 1 year, refreshed on every request
};

const CRAWLER_USER_AGENT_PATTERN = /(?:bot|crawler|spider|slurp|facebookexternalhit|twitterbot|slackbot|discordbot|linkedinbot|whatsapp|telegrambot|skypeuripreview|embedly|google-inspectiontool|googleother|googlebot|bingbot|applebot|bitlybot|vkshare)/i;
const PUBLIC_CRAWLER_SAFE_PATHS = new Set(["/", "/help.html", "/help-en.html"]);

let productionIndexHtmlCache = null;

const readIndexHtml = async () => {
  if (process.env.NODE_ENV !== "production") {
    return fs.promises.readFile(INDEX_HTML_PATH, "utf8");
  }

  if (productionIndexHtmlCache !== null) {
    return productionIndexHtmlCache;
  }

  productionIndexHtmlCache = await fs.promises.readFile(INDEX_HTML_PATH, "utf8");
  return productionIndexHtmlCache;
};

const shouldBypassSessionForCrawler = (req, pathname) => {
  if (!PUBLIC_CRAWLER_SAFE_PATHS.has(pathname)) return false;

  if (req.method === "HEAD") return true;

  const userAgent = req.headers["user-agent"];
  return typeof userAgent === "string" && CRAWLER_USER_AGENT_PATTERN.test(userAgent);
};

const shouldAttachSessionToRequest = (req) => {
  const pathname = (req.raw?.url || req.url || "/").split("?")[0];

  if (
    pathname === "/health" ||
    pathname === "/stats" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/security.txt" ||
    pathname === "/.well-known/security.txt" ||
    pathname === "/favicon.ico"
  ) {
    return false;
  }

  if (pathname.startsWith("/static/")) return false;
  if (shouldBypassSessionForCrawler(req, pathname)) return false;

  return true;
};

app.addHook("onRequest", (req, reply, done) => {
  if (!shouldAttachSessionToRequest(req)) {
    req.sessionId = null;
    done();
    return;
  }

  let sid = req.cookies.sid;
  if (sid) {
    // Validate session still exists in DB (guards against DB resets)
    const session = db.prepare("SELECT id FROM sessions WHERE id = ?").get(sid);
    if (session) {
      touchSession(sid);
      // Refresh cookie expiry on every request so active users never lose their session
      reply.setCookie("sid", sid, SESSION_COOKIE_OPTIONS);
    } else {
      // Cookie present but session gone (e.g. after DB reset) – create a new one
      sid = createSession();
      reply.setCookie("sid", sid, SESSION_COOKIE_OPTIONS);
    }
  } else {
    sid = createSession();
    reply.setCookie("sid", sid, SESSION_COOKIE_OPTIONS);
  }
  req.sessionId = sid;
  done();
});

const getPasteAccess = (pasteId, sessionId) => {
  const paste = db.prepare(
    "SELECT id, shared, session_id FROM pastes WHERE id = ?"
  ).get(pasteId);

  if (!paste) {
    return null;
  }

  const isOwner = paste.session_id === sessionId;
  const hasCollabAccess = isOwner || !!db.prepare(
    "SELECT id FROM collab_members WHERE paste_id = ? AND session_id = ? LIMIT 1"
  ).get(pasteId, sessionId);

  return {
    paste,
    isOwner,
    hasCollabAccess
  };
};

const requirePasteCollabAccess = (req, reply) => {
  const access = getPasteAccess(req.params.id, req.sessionId);
  if (!access) {
    reply.code(404);
    return { error: "Paste not found" };
  }

  if (!access.hasCollabAccess) {
    reply.code(403);
    return { error: "Not authorized" };
  }

  return access;
};

const getOwnedCollabMember = (pasteId, memberId, sessionId) => db.prepare(
  "SELECT id, fantasy_name, avatar_color FROM collab_members WHERE id = ? AND paste_id = ? AND session_id = ?"
).get(memberId, pasteId, sessionId);

app.get("/api/pastes", async (req) => {
  const stmt = db.prepare(
    "SELECT id, title, created_at, updated_at FROM pastes WHERE session_id = ? ORDER BY updated_at DESC LIMIT 50"
  );
  return stmt.all(req.sessionId);
});

app.get("/api/pastes/:id", async (req, reply) => {
  // First try to get paste for this session
  let row = db.prepare(
    "SELECT id, title, markdown, created_at, updated_at, shared FROM pastes WHERE id = ? AND session_id = ?"
  ).get(req.params.id, req.sessionId);
  
  // If not found in this session, check if it's a shared paste
  if (!row) {
    row = db.prepare(
      "SELECT id, title, markdown, created_at, updated_at, shared FROM pastes WHERE id = ? AND shared = 1"
    ).get(req.params.id);
  }
  
  if (!row) {
    reply.code(404);
    return { error: "Not found" };
  }
  return row;
});

app.post("/api/pastes", async (req, reply) => {
  const { markdown, title } = req.body || {};
  if (!markdown || typeof markdown !== "string") {
    reply.code(400);
    return { error: "Markdown required" };
  }
  if (markdown.length > 1024 * 1024) {
    reply.code(413);
    return { error: "Markdown too large (max 1MB)" };
  }
  if (title !== undefined && title !== null && String(title).length > 500) {
    reply.code(400);
    return { error: "Title too long (max 500 chars)" };
  }

  const storageCheck = await requireStorageHeadroom(reply, Buffer.byteLength(markdown, "utf8"));
  if (storageCheck !== true) {
    return storageCheck;
  }
  
  // Limit: configurable max pastes per session (default 100)
  const maxPastes = Number(process.env.MAX_PASTES_PER_SESSION) || 100;
  const count = db.prepare("SELECT COUNT(*) as cnt FROM pastes WHERE session_id = ?").get(req.sessionId);
  if (count.cnt >= maxPastes) {
    // Delete oldest paste to maintain limit
    const oldest = db.prepare(
      "SELECT id FROM pastes WHERE session_id = ? ORDER BY created_at ASC LIMIT 1"
    ).get(req.sessionId);
    if (oldest) {
      db.prepare("DELETE FROM pastes WHERE id = ?").run(oldest.id);
    }
  }
  
  const id = crypto.randomUUID();
  const ts = nowIso();
  const finalTitle = title?.trim() || deriveTitle(markdown);
  db.prepare(
    "INSERT INTO pastes (id, session_id, title, markdown, created_at, updated_at, shared) VALUES (?, ?, ?, ?, ?, ?, 0)"
  ).run(id, req.sessionId, finalTitle, markdown, ts, ts);
  return { id };
});

app.put("/api/pastes/:id", async (req, reply) => {
  const { markdown, title } = req.body || {};
  if (!markdown || typeof markdown !== "string") {
    reply.code(400);
    return { error: "Markdown required" };
  }
  if (markdown.length > 1024 * 1024) {
    reply.code(413);
    return { error: "Markdown too large (max 1MB)" };
  }
  if (title !== undefined && title !== null && String(title).length > 500) {
    reply.code(400);
    return { error: "Title too long (max 500 chars)" };
  }

  const existing = db.prepare(
    "SELECT LENGTH(markdown) as size FROM pastes WHERE id = ? AND session_id = ?"
  ).get(req.params.id, req.sessionId);
  if (!existing) {
    reply.code(404);
    return { error: "Not found" };
  }

  const deltaBytes = Math.max(Buffer.byteLength(markdown, "utf8") - Number(existing.size || 0), 0);
  const storageCheck = await requireStorageHeadroom(reply, deltaBytes);
  if (storageCheck !== true) {
    return storageCheck;
  }

  const finalTitle = title?.trim() || deriveTitle(markdown);
  const ts = nowIso();
  const res = db.prepare(
    "UPDATE pastes SET title = ?, markdown = ?, updated_at = ? WHERE id = ? AND session_id = ?"
  ).run(finalTitle, markdown, ts, req.params.id, req.sessionId);
  if (res.changes === 0) {
    reply.code(404);
    return { error: "Not found" };
  }
  return { id: req.params.id };
});

app.delete("/api/pastes/:id", async (req, reply) => {
  const paste = db.prepare(
    "SELECT id FROM pastes WHERE id = ? AND session_id = ?"
  ).get(req.params.id, req.sessionId);
  if (!paste) {
    reply.code(404);
    return { error: "Not found" };
  }

  deletePasteRelatedRecords(req.params.id);
  db.prepare("DELETE FROM pastes WHERE id = ?").run(req.params.id);

  // Cleanup assets from disk
  try {
    const assetDir = path.join(IMAGE_CONFIG.ASSETS_DIR, req.params.id);
    await fs.promises.rm(assetDir, { recursive: true, force: true });
  } catch (err) {
    app.log.warn({ err: err.message, pasteId: req.params.id }, "Could not cleanup assets");
  }

  return { ok: true };
});

app.post("/api/export/docx", async (req, reply) => {
  return exportQueue.execute(() => exportWithPandoc(req, reply, "docx"));
});

app.post("/api/export/pdf", async (req, reply) => {
  return exportQueue.execute(() => exportWithPandoc(req, reply, "pdf"));
});

app.post("/api/preview/citations/html", async (req, reply) => {
  return exportQueue.execute(async () => {
    const { markdown, previewMarkdown } = req.body || {};
    if (!markdown || typeof markdown !== "string") {
      reply.code(400);
      return { error: "Markdown required" };
    }

    const pandocAvailable = await checkPandoc();
    if (!pandocAvailable) {
      reply.code(501);
      return { error: "Pandoc not installed" };
    }

    try {
      const result = await renderCitationsToHtml({ markdown, previewMarkdown });
      return result;
    } catch (error) {
      reply.code(error?.statusCode || 500);
      return { error: error?.message || "Citations preview failed" };
    }
  });
});

// Toggle share status
app.post("/api/pastes/:id/share", async (req, reply) => {
  const { shared } = req.body || {};
  if (typeof shared !== "boolean") {
    reply.code(400);
    return { error: "shared must be boolean" };
  }
  const sharedAt = shared ? nowIso() : null;
  const res = db.prepare(
    "UPDATE pastes SET shared = ?, shared_at = ? WHERE id = ? AND session_id = ?"
  ).run(shared ? 1 : 0, sharedAt, req.params.id, req.sessionId);
  if (res.changes === 0) {
    reply.code(404);
    return { error: "Not found" };
  }
  return { id: req.params.id, shared };
});

// ── Image Upload & Management ───────────────────────────────────────────────
app.post("/api/pastes/:id/upload-image", async (req, reply) => {
  // Verify paste exists and belongs to this session
  const paste = db.prepare(
    "SELECT id FROM pastes WHERE id = ? AND session_id = ?"
  ).get(req.params.id, req.sessionId);
  
  if (!paste) {
    reply.code(404);
    return { error: "Paste not found" };
  }

  const { image, filename } = req.body || {};
  if (!image || typeof image !== "string") {
    reply.code(400);
    return { error: "image (base64) required" };
  }

  // Validate filename (clipboard pastes may have no name)
  const safeFilename = (filename && typeof filename === "string" && filename.trim())
    ? filename.trim().slice(0, 255)
    : `image-${Date.now()}.bin`;

  try {
    // Decode base64
    const buffer = Buffer.from(image, "base64");
    const sizeMB = buffer.length / 1024 / 1024;

    // Check size limit per image
    if (sizeMB > IMAGE_CONFIG.MAX_SIZE_MB) {
      reply.code(413);
      return { error: `Image too large (max ${IMAGE_CONFIG.MAX_SIZE_MB} MB)` };
    }

    const storageCheck = await requireStorageHeadroom(reply, buffer.length);
    if (storageCheck !== true) {
      return storageCheck;
    }

    // Check total size for this paste
    const totalSize = db.prepare(
      "SELECT SUM(size_bytes) as total FROM images WHERE paste_id = ?"
    ).get(req.params.id);
    const totalSizeMB = (totalSize?.total || 0) / 1024 / 1024;

    if (totalSizeMB + sizeMB > IMAGE_CONFIG.MAX_TOTAL_PER_PASTE_MB) {
      reply.code(413);
      return { 
        error: `Paste image limit exceeded (max ${IMAGE_CONFIG.MAX_TOTAL_PER_PASTE_MB} MB total)`
      };
    }

    // Detect MIME type from header
    let mimeType = "image/jpeg";
    const header = buffer.slice(0, 12);
    const headerStr = header.toString('utf8', 0, 6);
    
    if (buffer[0] === 0xff && buffer[1] === 0xd8) mimeType = "image/jpeg";
    else if (buffer[0] === 0x89 && buffer[1] === 0x50) mimeType = "image/png";
    else if (buffer[0] === 0x52 && buffer[1] === 0x49) mimeType = "image/webp";
    else if (headerStr === "GIF87a" || headerStr === "GIF89a") mimeType = "image/gif";
    else if (buffer[0] === 0x3c && headerStr.includes("svg")) mimeType = "image/svg+xml"; // <svg
    else {
      reply.code(400);
      return { error: "Invalid image format" };
    }

    if (!IMAGE_CONFIG.ALLOWED_MIMES.has(mimeType)) {
      reply.code(400);
      return { error: "Format not allowed" };
    }

    // Create asset directory
    const assetDir = path.join(IMAGE_CONFIG.ASSETS_DIR, req.params.id);
    await fs.promises.mkdir(assetDir, { recursive: true });

    // Save file with unique name to prevent collisions
    const extMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };
    const ext = extMap[mimeType] || 'bin';
    const uniqueFilename = `${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filepath = path.join(assetDir, uniqueFilename);

    await fs.promises.writeFile(filepath, buffer);

    // Record in database
    const imageId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO images (id, paste_id, filename, mime_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(imageId, req.params.id, uniqueFilename, mimeType, buffer.length, nowIso());

    app.log.info(
      { pasteId: req.params.id, filename: uniqueFilename, sizeMB: sizeMB.toFixed(2) },
      "Image uploaded"
    );

    return {
      id: imageId,
      url: `/assets/${req.params.id}/${uniqueFilename}`,
      filename: uniqueFilename,
      size: buffer.length
    };

  } catch (err) {
    app.log.error({ err: err.message }, "Image upload failed");
    reply.code(500);
    return { error: "Upload failed" };
  }
});

// Get image (public, respects paste sharing)
app.get("/assets/:pasteId/:filename", async (req, reply) => {
  try {
    const access = getPasteAccess(req.params.pasteId, req.sessionId);

    if (!access) {
      reply.code(404);
      return { error: "Not found" };
    }

    if (!access.paste.shared && !access.isOwner) {
      reply.code(403);
      return { error: "Forbidden" };
    }

    const filepath = path.join(
      IMAGE_CONFIG.ASSETS_DIR,
      req.params.pasteId,
      req.params.filename
    );

    // Security: prevent path traversal
    // Normalize manually in case ASSETS_DIR doesn't exist yet
    const assetBaseDir = path.resolve(IMAGE_CONFIG.ASSETS_DIR);
    const resolvedPath = path.resolve(filepath);
    if (!resolvedPath.startsWith(assetBaseDir + path.sep) && resolvedPath !== assetBaseDir) {
      reply.code(403);
      return { error: "Forbidden" };
    }

    const buffer = await fs.promises.readFile(filepath);
    
    // Detect and set proper MIME type
    let mimeType = "application/octet-stream";
    if (filepath.endsWith(".png")) mimeType = "image/png";
    else if (filepath.endsWith(".jpg") || filepath.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (filepath.endsWith(".webp")) mimeType = "image/webp";
    else if (filepath.endsWith(".gif")) mimeType = "image/gif";
    else if (filepath.endsWith(".svg")) mimeType = "image/svg+xml";

    reply.type(mimeType);
    reply.header("Cache-Control", "public, max-age=31536000"); // 1 year
    return reply.send(buffer);

  } catch (err) {
    if (err.code === "ENOENT") {
      reply.code(404);
      return { error: "Not found" };
    }
    app.log.error({ err: err.message }, "Asset retrieval failed");
    reply.code(500);
    return { error: "Failed to retrieve asset" };
  }
});

// AI Chat Completion
app.post("/api/chat/complete", async (req, reply) => {
  const { prompt, document = "", history = [], provider: requestedProvider, model: requestedModel, apiKey: requestApiKey } = req.body || {};
  
  // Support both old (message/currentMarkdown) and new (prompt/document) format
  const userPrompt = prompt || req.body.message;
  const currentDoc = document || req.body.currentMarkdown || "";
  const requestedProviderNormalized = normalizeAiProvider(requestedProvider);

  if (requestedProvider && !requestedProviderNormalized) {
    reply.code(400);
    return { error: "Unsupported AI provider" };
  }

  const provider = requestedProviderNormalized || getDefaultAiProvider();
  const model = typeof requestedModel === "string" && requestedModel.trim()
    ? requestedModel.trim()
    : getDefaultAiModel(provider);
  const apiKey = typeof requestApiKey === "string" && requestApiKey.trim()
    ? requestApiKey.trim()
    : getServerAiKey(provider);

  if (!apiKey) {
    reply.code(503);
    return { error: `${provider.toUpperCase()} API key not configured` };
  }
  
  if (!userPrompt || typeof userPrompt !== "string") {
    reply.code(400);
    return { error: "prompt required" };
  }

  if (userPrompt.length > 10000) {
    reply.code(413);
    return { error: "Prompt too long (max 10000 chars)" };
  }

  try {
    const systemPrompt = `Du bist ein KI-Assistent für einen Markdown-Editor. Du hilfst beim Schreiben, Formatieren und Verbessern von Markdown-Dokumenten.

INPUT-FORMAT:
Du erhältst:
- prompt: Die Anfrage des Benutzers
- document: Das aktuelle Markdown-Dokument (kann leer sein)

OUTPUT-FORMAT (IMMER JSON):
Antworte IMMER mit gültigem JSON in diesem Format:
{
  "message": "Deine Antwort/Erklärung an den Benutzer",
  "markdown": "Das angepasste Markdown-Dokument oder ein YAML-Layout-Fragment" oder null,
  "action": "REPLACE|INSERT|APPEND|PREPEND|UPDATE_LAYOUT|ADVICE"
}

AKTIONEN:
- REPLACE: Ersetzt das gesamte Dokument (markdown = neues vollständiges Dokument)
- INSERT: Fügt Text an Cursor-Position ein (markdown = einzufügender Text)
- APPEND: Hängt Text am Ende an (markdown = anzuhängender Text)
- PREPEND: Fügt Text am Anfang ein (markdown = voranzustellender Text)
- UPDATE_LAYOUT: Aktualisiert nur den layout-Codeblock (markdown = YAML-Fragment mit den zu ändernden Layout-Feldern)
- ADVICE: Nur Antwort, keine Dokumentänderung (markdown = null)

BEISPIELE:

1. Benutzer: "Schreibe eine Überschrift für einen Blogartikel über KI"
   Document: "" (leer)
   {
     "message": "Ich habe eine aussagekräftige Überschrift erstellt.",
     "markdown": "# Künstliche Intelligenz: Die Revolution unserer Zeit\\n\\n",
     "action": "REPLACE"
   }

2. Benutzer: "Was ist Markdown?"
   Document: "# Mein Dokument"
   {
     "message": "Markdown ist eine leichtgewichtige Auszeichnungssprache zum Formatieren von Text. Sie verwendet einfache Zeichen wie # für Überschriften oder ** für fett.",
     "markdown": null,
     "action": "ADVICE"
   }

3. Benutzer: "Füge eine Zusammenfassung hinzu"
   Document: "# Einleitung\\n\\nText..."
   {
     "message": "Ich habe eine Zusammenfassung am Ende hinzugefügt.",
     "markdown": "## Zusammenfassung\\n\\nDie wichtigsten Punkte...",
     "action": "APPEND"
   }

4. Benutzer: "Mache die Seitenränder breiter und aktiviere eine Kopfzeile"
   Document: "# Bericht"
   {
     "message": "Ich habe das Layout mit breiteren Seitenrändern und einer Kopfzeile aktualisiert.",
     "markdown": "page:\n  margins:\n    top: 2.8cm\n    right: 2.4cm\n    bottom: 2.4cm\n    left: 2.8cm\nheader:\n  enabled: true\n  right: '{page}'",
     "action": "UPDATE_LAYOUT"
   }

REGELN:
- Antworte IMMER mit gültigem JSON
- Behalte Markdown-Formatierung bei (##, **, -, etc.)
- Wenn die Anfrage das Layout, Seitenformat, Ränder, Spalten, Kopf-/Fußzeilen oder Typografie betrifft, bevorzuge UPDATE_LAYOUT statt REPLACE/APPEND
- Sei präzise und knapp
- Reine Chat-, Meta- oder Hilfefragen wie "Wer bist du?", "Was kannst du?" oder "Wie funktioniert das?" sind IMMER action=ADVICE und markdown=null
- Bei unklaren Anfragen: action=ADVICE, markdown=null`;

    // Structured input message
    const inputMessage = JSON.stringify({
      prompt: userPrompt,
      document: currentDoc
    });

    const messages = buildAiMessages(history, inputMessage, systemPrompt);
    let text = "";

    if (provider === "groq") {
      text = await requestGroqChatCompletion({ apiKey, model, messages });
    } else if (provider === "openai") {
      text = await requestOpenAiChatCompletion({ apiKey, model, messages });
    } else if (provider === "claude") {
      text = await requestClaudeChatCompletion({ apiKey, model, history: trimAiHistory(history), inputMessage, systemPrompt });
    } else {
      text = await requestGeminiChatCompletion({ apiKey, model, history: trimAiHistory(history), inputMessage, systemPrompt });
    }

    let normalizedText = String(text || '').trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = normalizedText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
    if (jsonMatch) {
      normalizedText = jsonMatch[1].trim();
    }

    if (!(normalizedText.startsWith('{') && normalizedText.endsWith('}'))) {
      const objectMatch = normalizedText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        normalizedText = objectMatch[0].trim();
      }
    }

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(normalizedText);
      
      // Ensure response has required fields
      if (!parsedResponse.message || !parsedResponse.action) {
        throw new Error("Invalid response format");
      }
      
      const requestedAction = typeof parsedResponse.action === "string"
        ? parsedResponse.action.trim().toUpperCase()
        : "ADVICE";
      const forceAdvice = shouldForceAdviceResponse(userPrompt);
      const allowDocumentChange = shouldAllowDocumentChange(userPrompt);
      const normalizedAction = forceAdvice || (requestedAction !== "ADVICE" && !allowDocumentChange)
        ? "ADVICE"
        : requestedAction;
      const normalizedMarkdown = forceAdvice
        || normalizedAction === "ADVICE"
        ? null
        : parsedResponse.markdown || parsedResponse.content || null;

      // Normalize response format
      return {
        message: parsedResponse.message,
        markdown: normalizedMarkdown,
        action: normalizedAction,
        // Legacy field for backward compatibility
        content: normalizedMarkdown
      };
      
    } catch (parseError) {
      const salvagedResponse = salvageStructuredAiResponse(normalizedText);
      if (salvagedResponse?.message && salvagedResponse?.action) {
        const requestedAction = salvagedResponse.action;
        const forceAdvice = shouldForceAdviceResponse(userPrompt);
        const allowDocumentChange = shouldAllowDocumentChange(userPrompt);
        const normalizedAction = forceAdvice || (requestedAction !== "ADVICE" && !allowDocumentChange)
          ? "ADVICE"
          : requestedAction;
        const normalizedMarkdown = forceAdvice || normalizedAction === "ADVICE"
          ? null
          : salvagedResponse.markdown || null;

        return {
          message: salvagedResponse.message,
          markdown: normalizedMarkdown,
          action: normalizedAction,
          content: normalizedMarkdown
        };
      }

      // Fallback: treat as plain advice
      return {
        message: normalizedText,
        markdown: null,
        action: "ADVICE",
        content: null
      };
    }

  } catch (error) {
    console.error("=== AI API Error ===");
    console.error("Provider:", requestedProviderNormalized || getDefaultAiProvider());
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("Full error:", error);
    console.error("======================");
    
    if (error.message?.includes("API_KEY_INVALID") || error.statusCode === 401) {
      reply.code(503);
      return { error: "Invalid API key" };
    }
    
    if (error.message?.includes("RATE_LIMIT") || error.statusCode === 429) {
      reply.code(429);
      return { error: "Rate limit exceeded. Try again later." };
    }

    reply.code(500);
    return { error: "AI service unavailable" };
  }
});

const deriveTitle = (markdown) => {
  const match = markdown.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
};

const scientificFrontmatterRegex = /^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/;
const scientificLayoutBlockRegex = /```layout\s*\n[\s\S]*?\n```/g;
const scientificPandocReader = "markdown+yaml_metadata_block+citations+fenced_divs+fenced_code_attributes+pipe_tables+table_captions+footnotes+tex_math_dollars+header_attributes+implicit_figures";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const extractScientificFrontmatter = (markdown) => {
  const match = String(markdown || "").replace(/\r/g, "").match(scientificFrontmatterRegex);
  return match ? match[1] : "";
};

const stripScientificLayoutBlock = (markdown) => String(markdown || "").replace(scientificLayoutBlockRegex, "").trimEnd();

const stripScientificFrontmatter = (markdown) => String(markdown || "").replace(scientificFrontmatterRegex, "").trimStart();

const rewritePublicResourcePathForPandoc = (resourcePath) => {
  const value = String(resourcePath || "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) {
    return value;
  }

  if (value.startsWith("/static/")) {
    return `public/${value.slice("/static/".length)}`;
  }

  if (value.startsWith("/assets/")) {
    return value.slice(1);
  }

  return value;
};

const rewriteMarkdownResourcePathsForPandoc = (markdown) => String(markdown || "")
  .replace(/(!\[[^\]]*\]\()\s*(<)?(\/[^)\s>]+)(>)?([^)]*\))/g, (_match, prefix, openAngle, resourcePath, closeAngle, suffix) => {
    const rewritten = rewritePublicResourcePathForPandoc(resourcePath);
    return `${prefix}${openAngle || ""}${rewritten}${closeAngle || ""}${suffix}`;
  })
  .replace(/(<img\b[^>]*\bsrc=["'])(\/[^"']+)(["'])/gi, (_match, prefix, resourcePath, suffix) => {
    return `${prefix}${rewritePublicResourcePathForPandoc(resourcePath)}${suffix}`;
  });

const stripMarkdownCodeSamples = (markdown) => String(markdown || "")
  .replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$)/g, "\n")
  .replace(/`[^`\n]+`/g, "");

const normalizeYamlScalar = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const parseYamlPathList = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1)
      .split(",")
      .map((entry) => normalizeYamlScalar(entry))
      .filter(Boolean);
  }
  return [normalizeYamlScalar(trimmed)].filter(Boolean);
};

const embeddedBibliographyBlockRegex = /(^|\n)(`{3,}|~{3,})mdedit-bibliography[^\n]*\n([\s\S]*?)\n\2(?=\n|$)/gi;

const stripEmbeddedBibliographyBlocks = (markdown) => String(markdown || "").replace(
  embeddedBibliographyBlockRegex,
  (match, prefix) => prefix || ""
);

const extractEmbeddedBibliography = (markdown) => {
  const matches = Array.from(String(markdown || "").matchAll(embeddedBibliographyBlockRegex));
  embeddedBibliographyBlockRegex.lastIndex = 0;

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw createHttpError(400, "Nur ein mdedit-bibliography-Block ist pro Dokument erlaubt.");
  }

  const rawJson = String(matches[0][3] || "").trim();
  if (!rawJson) {
    throw createHttpError(400, "Der mdedit-bibliography-Block ist leer.");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (_error) {
    throw createHttpError(400, "Der mdedit-bibliography-Block enthaelt kein gueltiges JSON.");
  }

  const format = Array.isArray(parsed)
    ? "csl-json"
    : normalizeYamlScalar(parsed?.format || "csl-json").toLowerCase();
  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.items)
      ? parsed.items
      : null;

  if (format !== "csl-json") {
    throw createHttpError(400, "Der mdedit-bibliography-Block unterstuetzt aktuell nur format: csl-json.");
  }

  if (!Array.isArray(items)) {
    throw createHttpError(400, "Der mdedit-bibliography-Block braucht ein items-Array im CSL-JSON-Format.");
  }

  return { format, items };
};

const extractCitationMetadata = (markdown) => {
  const frontmatter = extractScientificFrontmatter(markdown);
  const embeddedBibliography = extractEmbeddedBibliography(markdown);
  if (!frontmatter) {
    return {
      frontmatter: "",
      bibliography: [],
      citationSource: null,
      embeddedBibliography,
      hasLegacyBibliographyPaths: false,
      csl: null,
      referenceSectionTitle: null,
      hasCitationMetadata: Boolean(embeddedBibliography)
    };
  }

  const lines = frontmatter.split("\n");
  const bibliography = [];
  let citationSource = null;
  let csl = null;
  let referenceSectionTitle = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const bibliographyMatch = line.match(/^\s*bibliography\s*:\s*(.*)$/i);
    if (bibliographyMatch) {
      const remainder = bibliographyMatch[1].trim();
      if (remainder) {
        bibliography.push(...parseYamlPathList(remainder));
        continue;
      }

      const baseIndent = (line.match(/^\s*/) || [""])[0].length;
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextLine = lines[cursor];
        const nextIndent = (nextLine.match(/^\s*/) || [""])[0].length;
        if (nextLine.trim() && nextIndent <= baseIndent) break;
        const itemMatch = nextLine.match(/^\s*-\s*(.+?)\s*$/);
        if (itemMatch) {
          bibliography.push(normalizeYamlScalar(itemMatch[1]));
        }
        cursor += 1;
      }
      index = cursor - 1;
      continue;
    }

    const citationSourceMatch = line.match(/^\s*citation-source\s*:\s*(.+?)\s*$/i);
    if (citationSourceMatch) {
      citationSource = normalizeYamlScalar(citationSourceMatch[1]).toLowerCase();
      continue;
    }

    const cslMatch = line.match(/^\s*csl\s*:\s*(.+?)\s*$/i);
    if (cslMatch) {
      csl = normalizeYamlScalar(cslMatch[1]);
      continue;
    }

    const referenceSectionTitleMatch = line.match(/^\s*reference-section-title\s*:\s*(.+?)\s*$/i);
    if (referenceSectionTitleMatch) {
      referenceSectionTitle = normalizeYamlScalar(referenceSectionTitleMatch[1]);
    }
  }

  return {
    frontmatter,
    bibliography: bibliography.filter(Boolean),
    citationSource,
    embeddedBibliography,
    hasLegacyBibliographyPaths: bibliography.length > 0,
    csl,
    referenceSectionTitle,
    hasCitationMetadata: bibliography.length > 0
      || Boolean(citationSource)
      || Boolean(embeddedBibliography)
      || Boolean(csl)
      || /(^|\n)\s*(reference-section-title|link-citations|link-bibliography|nocite)\s*:/i.test(frontmatter)
  };
};

const hasCitationSyntax = (markdown) => {
  const plain = stripMarkdownCodeSamples(stripScientificFrontmatter(stripScientificLayoutBlock(markdown)));
  return /\[[^\]]*?@[a-zA-Z0-9:_-]+[^\]]*?\]/.test(plain)
    || /(^|[\s(])-?@[a-zA-Z0-9:_-]+/m.test(plain)
    || /(^|\n)\s*#refs\s*(?=\n|$)/m.test(plain);
};

const normalizeReferenceSectionTitle = (value) => String(value || "")
  .replace(/\r?\n+/g, " ")
  .trim();

const normalizeScientificRefsPlaceholder = (markdown, { referenceSectionTitle } = {}) => {
  const normalizedTitle = normalizeReferenceSectionTitle(referenceSectionTitle);
  const replacement = normalizedTitle
    ? `\n\n# ${normalizedTitle}\n\n::: {#refs}\n:::\n`
    : "\n\n::: {#refs}\n:::\n";

  return String(markdown || "").replace(
    /(^|\n)\s*#refs\s*(?=\n|$)/g,
    (_match, prefix) => `${prefix}${replacement}`
  );
};

const stripTableMarkersForPandoc = (markdown) => String(markdown || "").replace(
  /^[ \t]*:::\s*table\{[^}]*\}\s*\n([\s\S]*?)\n^[ \t]*:::\s*$/gm,
  '$1'
);

const hydrateTableLayoutTokensForPandoc = (markdown) => String(markdown || '').replace(
  /^[ \t]*\[{1,2}MDLAYOUT:table(?:;layout=([a-z0-9_-]+))?\]{1,2}[ \t]*$/gim,
  (_match, layout = 'default') => `<div class="table-layout-marker" data-layout="${layout}"></div>`
);

const stripClientSideMarkersForPandoc = (markdown) => String(markdown || "")
  // [[toc]] is kept as-is: Pandoc outputs <p>[[toc]]</p>, client hydrateTableOfContents() handles it.
  // Convert list-of-figures/tables HTML comments and ::: syntax to MDLAYOUT tokens so
  // Pandoc passes them through as text nodes that client hydrateLayoutTokens() can find.
  .replace(/^[ \t]*<!--[ \t]*list-of-figures[ \t]*-->[ \t]*$/gim, '[[MDLAYOUT:list-of-figures]]')
  .replace(/^[ \t]*<!--[ \t]*list-of-tables[ \t]*-->[ \t]*$/gim, '[[MDLAYOUT:list-of-tables]]')
  .replace(/^[ \t]*:::\s*list-of-figures[ \t]*$/gim, '[[MDLAYOUT:list-of-figures]]')
  .replace(/^[ \t]*:::\s*list-of-tables[ \t]*$/gim, '[[MDLAYOUT:list-of-tables]]');

const normalizeScientificMarkdownForPandoc = (markdown, options = {}) => rewriteMarkdownResourcePathsForPandoc(
  normalizeScientificRefsPlaceholder(
    stripClientSideMarkersForPandoc(
      hydrateTableLayoutTokensForPandoc(
        stripTableMarkersForPandoc(
          stripEmbeddedBibliographyBlocks(stripScientificLayoutBlock(String(markdown || "")))
        )
      )
    ),
    options
  )
);

const getScientificAllowedResourceBases = () => Array.from(new Set([
  path.resolve(process.env.DATA_DIR || __dirname),
  path.resolve(__dirname)
]));

const isPathWithinBase = (candidate, base) => candidate === base || candidate.startsWith(`${base}${path.sep}`);

const resolveScientificResourcePath = (resourcePath, label) => {
  const rawValue = normalizeYamlScalar(resourcePath);
  if (!rawValue) return null;
  if (rawValue.includes("\0") || /^[a-z]+:/i.test(rawValue) || path.isAbsolute(rawValue)) {
    throw createHttpError(400, `${label} must be a relative path inside the allowed data directories.`);
  }

  for (const base of getScientificAllowedResourceBases()) {
    const candidate = path.resolve(base, rawValue);
    if (!isPathWithinBase(candidate, base)) {
      continue;
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw createHttpError(400, `${label} not found: ${rawValue}`);
};

const buildCitationSpec = (markdown, { previewMarkdown, tmpDir } = {}) => {
  const sourceMarkdown = String(markdown || "");
  const metadata = extractCitationMetadata(sourceMarkdown);
  const hasRenderableCitationState = metadata.hasLegacyBibliographyPaths
    || Boolean(metadata.embeddedBibliography)
    || Boolean(metadata.csl)
    || Boolean(metadata.referenceSectionTitle)
    || /(^|\n)\s*(link-citations|link-bibliography|nocite)\s*:/i.test(metadata.frontmatter)
    || hasCitationSyntax(sourceMarkdown);
  const isCitationDocument = metadata.hasCitationMetadata || hasRenderableCitationState;

  if (!isCitationDocument) {
    return {
      isCitationDocument: false,
      normalizedMarkdown: normalizeScientificMarkdownForPandoc(sourceMarkdown, {
        referenceSectionTitle: metadata.referenceSectionTitle,
      })
    };
  }

  if (metadata.hasLegacyBibliographyPaths) {
    throw createHttpError(400, "Filesystem-basierte bibliography-Pfade werden nicht mehr unterstuetzt. Bitte migriere das Dokument auf einen mdedit-bibliography-Block.");
  }

  if (!metadata.embeddedBibliography) {
    throw createHttpError(400, "Zitationssyntax gefunden, aber die eingebettete Bibliothek fehlt oder ist ungueltig.");
  }

  if (!tmpDir) {
    throw new Error("buildCitationSpec requires tmpDir for citation documents");
  }

  const bibliographyPath = path.join(tmpDir, "embedded-bibliography.json");
  fs.writeFileSync(bibliographyPath, `${JSON.stringify(metadata.embeddedBibliography.items, null, 2)}\n`, "utf8");
  const cslFile = metadata.csl ? resolveScientificResourcePath(metadata.csl, "CSL") : null;
  const resourceDirs = Array.from(new Set([
    ...getScientificAllowedResourceBases(),
    ...(cslFile ? [path.dirname(cslFile)] : [])
  ]));
  const pandocArgs = ["--citeproc", `--bibliography=${bibliographyPath}`, "--mathml"];
  if (resourceDirs.length > 0) {
    pandocArgs.push(`--resource-path=${resourceDirs.join(path.delimiter)}`);
  }

  return {
    isCitationDocument: true,
    // Always use sourceMarkdown (raw) for Pandoc — previewMarkdown contains
    // client-side layout tokens (e.g. [[MDLAYOUT:table;layout=scientific]])
    // that break Pandoc's block detection: a token on line N and a pipe table
    // on line N+1 are merged into one <p> with no blank line separator.
    normalizedMarkdown: normalizeScientificMarkdownForPandoc(sourceMarkdown, {
      referenceSectionTitle: metadata.referenceSectionTitle,
    }),
    pandocFromArg: `--from=${scientificPandocReader}`,
    pandocArgs
  };
};

const runPandocCaptureStdout = async (args) => {
  const proc = spawn("pandoc", args, { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";

  proc.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  proc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return new Promise((resolve) => {
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
  });
};

const renderCitationsToHtml = async ({ markdown, previewMarkdown }) => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "md-citations-"));
  try {
    const citationSpec = buildCitationSpec(markdown, { previewMarkdown, tmpDir });
    if (!citationSpec.isCitationDocument) {
      return { html: "", isCitationDocument: false };
    }

    const inputPath = path.join(tmpDir, "input.md");
    await fs.promises.writeFile(inputPath, citationSpec.normalizedMarkdown, "utf8");
    const result = await runPandocCaptureStdout([
      inputPath,
      citationSpec.pandocFromArg,
      "--to=html5",
      ...citationSpec.pandocArgs
    ]);

    if (result.code !== 0) {
      const detail = (result.stderr || "").trim().slice(0, 1200);
      throw createHttpError(400, detail || "Pandoc konnte Zitationen nicht aufloesen.");
    }

    return {
      // Rewrite Pandoc's local-file src paths ("public/brand/foo.png") back to
      // server-accessible URLs ("/static/brand/foo.png") so the browser preview
      // can load them, and so the serialized DOM sent to Chromium has a URL that
      // inlineLocalImagesForChromium can recognize and base64-encode.
      html: String(result.stdout || "").trim()
        .replace(/\bsrc="public\/([^"]+)"/g, 'src="/static/$1"')
        .replace(/\bsrc="assets\/([^"]+)"/g, 'src="/assets/$1"'),
      isCitationDocument: true
    };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
};

const escapeHtmlText = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const formatNumber = (value) => new Intl.NumberFormat("de-DE").format(Number(value || 0));

const formatBytes = (bytes) => {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "0 Byte";
  const units = ["Byte", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / 1024 ** exponent;
  return `${scaled >= 10 || exponent === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[exponent]}`;
};

const getDiskSpaceStats = () => {
  try {
    const stats = fs.statfsSync(process.env.DATA_DIR || __dirname);
    const blockSize = stats.bsize || stats.frsize || 4096;
    const totalBytes = Number(stats.blocks || 0) * blockSize;
    const freeBytes = Number(stats.bavail || 0) * blockSize;
    const usedBytes = Math.max(totalBytes - freeBytes, 0);
    return { totalBytes, usedBytes, freeBytes };
  } catch (err) {
    app.log.warn({ err: err.message }, "Could not determine disk space stats");
    return { totalBytes: 0, usedBytes: 0, freeBytes: 0 };
  }
};

const getDiskFreePercent = () => {
  const { totalBytes, freeBytes } = getDiskSpaceStats();
  if (!totalBytes) return 100;
  return (freeBytes / totalBytes) * 100;
};

const assessStorageHeadroom = (estimatedAdditionalBytes = 0) => {
  const disk = getDiskSpaceStats();
  const minFreeBytes = STORAGE_GUARD.MIN_FREE_MB * 1024 * 1024;
  const projectedFreeBytes = Math.max(disk.freeBytes - Math.max(Number(estimatedAdditionalBytes) || 0, 0), 0);
  const projectedFreePercent = disk.totalBytes > 0
    ? (projectedFreeBytes / disk.totalBytes) * 100
    : 100;

  return {
    disk,
    projectedFreeBytes,
    projectedFreePercent,
    isLow: projectedFreeBytes <= minFreeBytes || projectedFreePercent <= STORAGE_GUARD.DISK_CRITICAL_PERCENT
  };
};

let pruneDatabaseInFlight = null;

const maybeRunStorageCleanup = async () => {
  if (pruneDatabaseInFlight) return pruneDatabaseInFlight;

  pruneDatabaseInFlight = Promise.resolve(pruneDatabase())
    .catch((err) => {
      app.log.warn({ err: err.message }, "On-demand storage cleanup failed");
    })
    .finally(() => {
      pruneDatabaseInFlight = null;
    });

  return pruneDatabaseInFlight;
};

const requireStorageHeadroom = async (reply, estimatedAdditionalBytes = 0) => {
  let assessment = assessStorageHeadroom(estimatedAdditionalBytes);
  if (!assessment.isLow) return true;

  await maybeRunStorageCleanup();
  assessment = assessStorageHeadroom(estimatedAdditionalBytes);
  if (!assessment.isLow) return true;

  reply.code(507);
  return {
    error: `Storage temporarily unavailable (${formatBytes(assessment.disk.freeBytes)} free). Please delete content or try again later.`
  };
};

const getDirectorySizeBytes = async (dirPath) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySizeBytes(fullPath);
      } else if (entry.isFile()) {
        total += (await fs.promises.stat(fullPath)).size;
      }
    }
    return total;
  } catch {
    return 0;
  }
};

const getStatsCountsForWindow = (sinceIso = null) => {
  const activeAppSessions = sinceIso
    ? db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT session_id AS sid FROM pastes WHERE updated_at >= ?
          UNION
          SELECT session_id AS sid FROM collab_members WHERE session_id IS NOT NULL AND last_seen >= ?
        )
      `).get(sinceIso, sinceIso).count
    : db.prepare(`
        SELECT COUNT(*) as count FROM (
          SELECT session_id AS sid FROM pastes
          UNION
          SELECT session_id AS sid FROM collab_members WHERE session_id IS NOT NULL
        )
      `).get().count;

  const linkedBrowserSessions = sinceIso
    ? db.prepare(`
        SELECT COUNT(*) as count
        FROM sessions s
        WHERE s.created_at >= ?
          AND (
            EXISTS (SELECT 1 FROM pastes p WHERE p.session_id = s.id)
            OR EXISTS (SELECT 1 FROM collab_members cm WHERE cm.session_id = s.id)
          )
      `).get(sinceIso).count
    : db.prepare(`
        SELECT COUNT(*) as count
        FROM sessions s
        WHERE EXISTS (SELECT 1 FROM pastes p WHERE p.session_id = s.id)
           OR EXISTS (SELECT 1 FROM collab_members cm WHERE cm.session_id = s.id)
      `).get().count;

  const createdDocuments = sinceIso
    ? db.prepare("SELECT COUNT(*) as count FROM pastes WHERE created_at >= ?").get(sinceIso).count
    : db.prepare("SELECT COUNT(*) as count FROM pastes").get().count;

  const shareActivations = sinceIso
    ? db.prepare("SELECT COUNT(*) as count FROM pastes WHERE shared_at IS NOT NULL AND shared_at >= ?").get(sinceIso).count
    : db.prepare("SELECT COUNT(*) as count FROM pastes WHERE shared_at IS NOT NULL").get().count;

  return { activeAppSessions, linkedBrowserSessions, createdDocuments, shareActivations };
};

const renderStatsPage = async () => {
  const now = Date.now();
  const windows = [
    { key: "24h", label: "Letzte 24 Stunden", sinceIso: new Date(now - 24 * 60 * 60 * 1000).toISOString() },
    { key: "30d", label: "Letzte 30 Tage", sinceIso: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString() },
    { key: "all", label: "Gesamt", sinceIso: null }
  ];

  const windowRows = windows.map((window) => ({
    ...window,
    counts: getStatsCountsForWindow(window.sinceIso)
  }));

  const markdownBytes = db.prepare("SELECT SUM(LENGTH(markdown)) as total FROM pastes").get().total || 0;
  const imageBytes = db.prepare("SELECT SUM(size_bytes) as total FROM images").get().total || 0;
  const dataDir = process.env.DATA_DIR || __dirname;
  const appDataBytes = await getDirectorySizeBytes(dataDir);
  const assetBytesOnDisk = await getDirectorySizeBytes(IMAGE_CONFIG.ASSETS_DIR);
  const disk = getDiskSpaceStats();

  const rowsHtml = windowRows.map((row) => `
    <tr>
      <th scope="row">${escapeHtmlText(row.label)}</th>
      <td>${formatNumber(row.counts.activeAppSessions)}</td>
      <td>${formatNumber(row.counts.linkedBrowserSessions)}</td>
      <td>${formatNumber(row.counts.createdDocuments)}</td>
      <td>${formatNumber(row.counts.shareActivations)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>mdedit.io Stats</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f8fb;
      --panel: #ffffff;
      --text: #18222d;
      --muted: #66737f;
      --border: #cfdbe6;
      --accent: #0089cf;
      --accent-soft: #d9eefb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #f8fbfd 0%, var(--bg) 100%);
      color: var(--text);
    }
    main {
      max-width: 1080px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    h1, h2 { margin: 0 0 14px; }
    p { margin: 0; color: var(--muted); }
    .hero {
      margin-bottom: 24px;
      padding: 22px 24px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--panel);
      box-shadow: 0 20px 50px rgba(18, 40, 56, 0.08);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--panel);
      box-shadow: 0 10px 30px rgba(18, 40, 56, 0.05);
    }
    .table-shell {
      margin-top: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .metric {
      font-size: 28px;
      line-height: 1.1;
      font-weight: 700;
      margin-top: 8px;
      color: var(--accent);
    }
    table {
      width: 100%;
      min-width: 620px;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      white-space: nowrap;
    }
    th {
      font-size: 13px;
      color: var(--muted);
      font-weight: 600;
    }
    td { font-size: 15px; }
    tbody th {
      color: var(--text);
      font-size: 15px;
      width: 28%;
    }
    .hint {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--accent-soft);
      color: var(--text);
      font-size: 14px;
    }
    code {
      font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      font-size: 13px;
      padding: 2px 6px;
      border-radius: 999px;
      background: rgba(0, 137, 207, 0.12);
      color: var(--text);
    }
    @media (max-width: 720px) {
      main {
        padding: 24px 14px 40px;
      }
      .hero,
      .card {
        padding: 16px;
        border-radius: 14px;
      }
      .table-shell {
        margin: 8px -4px 0;
        padding: 0 4px 2px;
      }
      table {
        min-width: 560px;
      }
      th,
      td,
      tbody th {
        padding: 10px 12px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <h1>Server-Statistiken</h1>
      <p>Aktive App-Sessions = Sessions mit Dokument- oder Kollaborationsaktivität im Zeitraum. Browser-Sessions = neu angelegte, app-relevante Sessions. Dokumente = neu angelegte Dokumente. Freigaben = erstmals freigegebene Permalinks.</p>
    </section>

    <section class="card" style="margin-bottom: 24px;">
      <h2>Nutzung</h2>
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Zeitraum</th>
              <th>Aktive App-Sessions</th>
              <th>Browser-Sessions</th>
              <th>Neue Dokumente</th>
              <th>Freigaben</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </section>

    <section class="grid">
      <article class="card">
        <h2>Dokumentinhalt</h2>
        <p>Nur Markdown- und Bildinhalte, ohne DB-, WAL-, Session- und Secret-Overhead</p>
        <div class="metric">${escapeHtmlText(formatBytes(markdownBytes + imageBytes))}</div>
        <p style="margin-top: 10px;">Markdown: <strong>${escapeHtmlText(formatBytes(markdownBytes))}</strong><br>Bilder: <strong>${escapeHtmlText(formatBytes(imageBytes))}</strong></p>
      </article>
      <article class="card">
        <h2>App-Daten</h2>
        <p>Plattenplatz des Datenverzeichnisses inklusive DB, WAL, Bilder und Secrets</p>
        <div class="metric">${escapeHtmlText(formatBytes(appDataBytes))}</div>
        <p style="margin-top: 10px;">Asset-Verzeichnis: <strong>${escapeHtmlText(formatBytes(assetBytesOnDisk))}</strong><br>Datenpfad: <code>${escapeHtmlText(dataDir)}</code></p>
      </article>
      <article class="card">
        <h2>Freier Plattenplatz</h2>
        <p>Verfügbar auf dem Volume des Datenverzeichnisses</p>
        <div class="metric">${escapeHtmlText(formatBytes(disk.freeBytes))}</div>
        <p style="margin-top: 10px;">Belegt: <strong>${escapeHtmlText(formatBytes(disk.usedBytes))}</strong><br>Gesamt: <strong>${escapeHtmlText(formatBytes(disk.totalBytes))}</strong></p>
      </article>
    </section>
  </main>
</body>
</html>`;
};

const stripAtPageRules = (cssText) => {
  if (!cssText || !cssText.includes("@page")) return cssText || "";
  let output = "";
  let index = 0;

  while (index < cssText.length) {
    const atPageIndex = cssText.indexOf("@page", index);
    if (atPageIndex === -1) {
      output += cssText.slice(index);
      break;
    }

    output += cssText.slice(index, atPageIndex);
    const blockStart = cssText.indexOf("{", atPageIndex);
    if (blockStart === -1) {
      break;
    }

    let depth = 1;
    let cursor = blockStart + 1;
    while (cursor < cssText.length && depth > 0) {
      const ch = cssText[cursor];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      cursor += 1;
    }
    index = cursor;
  }

  return output;
};

const extractEmbeddedPagedStyles = (html) => {
  const styleRegex = /<style\s+data-export-paged=["']1["']\s*>([\s\S]*?)<\/style>/i;
  const match = html.match(styleRegex);
  if (!match) {
    return { bodyHtml: html, embeddedCss: "" };
  }

  const embeddedCss = match[1] || "";
  const bodyHtml = html.replace(styleRegex, "");
  return { bodyHtml, embeddedCss };
};

/**
 * Post-processes the Paged.js serialised HTML to merge near-empty pages into the
 * preceding page.  Paged.js sometimes places a section heading + a few lines on a
 * fresh page even when the preceding page has ample room (e.g. after a flex-column
 * block whose rendered height was over-counted during layout).  The result is a PDF
 * page that is almost entirely blank, which looks unprofessional.
 *
 * Algorithm:
 *  1. Split the HTML into a sequence of pagedjs_page chunks.
 *  2. Count the visible text in each chunk (tags stripped, whitespace normalised).
 *  3. If a page has fewer than MERGE_THRESHOLD characters of text AND it is not the
 *     only content page (page 1 is typically a cover), extract its inner content div
 *     and append it to the preceding page's content area, then drop the empty page.
 *
 * This is intentionally conservative: only pages with very little text are merged
 * (the threshold is well below any real content page) and the merge happens at most
 * once per call (the first near-empty page found).
 */
const mergeNearEmptyPagedPages = (html) => {
  const MERGE_THRESHOLD = 250; // visible chars – tune if needed

  // Split at pagedjs_page div boundaries (keep the separator)
  const pagePattern = /(?=<div[^>]+\bdata-page-number=["'])/g;
  const parts = html.split(pagePattern);

  // Strip tags to count visible text in a chunk
  const visibleText = (chunk) =>
    chunk.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // Find the first near-empty page (skip index 0 which is HTML before page 1)
  let mergeIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    const txt = visibleText(parts[i]);
    if (txt.length < MERGE_THRESHOLD && i > 1) {
      mergeIdx = i;
      break;
    }
  }
  if (mergeIdx === -1) return html; // nothing to merge

  // Extract the inner content of the near-empty page's pagedjs_page_content div.
  const emptyPage = parts[mergeIdx];
  const contentMatch = emptyPage.match(
    /class="pagedjs_page_content"[^>]*>([\s\S]*?)<\/div>\s*<div class="pagedjs_footnote_area"/
  );
  if (!contentMatch) return html; // unexpected structure – bail out safely
  const innerContent = contentMatch[1]; // e.g. <div><div class="print-content">…</div></div>

  // Append innerContent before the closing </div> of the preceding page's
  // pagedjs_page_content.  That closing </div> is followed by the footnote area.
  const prevPage = parts[mergeIdx - 1];
  const insertPoint = prevPage.lastIndexOf(
    '</div>\n                                <div class="pagedjs_footnote_area"'
  );
  if (insertPoint === -1) return html; // structure mismatch – bail out safely

  parts[mergeIdx - 1] =
    prevPage.slice(0, insertPoint) +
    innerContent +
    prevPage.slice(insertPoint);

  // Drop the near-empty page
  parts.splice(mergeIdx, 1);

  return parts.join("");
};

const stripAtPageFromAllStyleTags = (html) => {
  if (!html || !html.includes("<style")) return html || "";
  return html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, cssText) => {
    const cleaned = stripAtPageRules(cssText || "");
    return `<style${attrs}>${cleaned}</style>`;
  });
};
const inlineLocalImagesForChromium = async (html) => {
  const publicDir = path.join(__dirname, "public");
  const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp" };

  // Resolve a src attribute value to an absolute local path under publicDir, or null.
  const resolveToLocalPath = (src) => {
    if (!src || /^(data:|https?:|file:)/.test(src)) return null;
    let rel = null;
    if (/^(?:https?:\/\/[^/]+)?\/static\//.test(src)) {
      // /static/brand/foo.png  or  http://host/static/brand/foo.png
      rel = src.replace(/^(?:https?:\/\/[^/]+)?\/static\//, '');
    } else if (/^(?:https?:\/\/[^/]+)?\/public\//.test(src)) {
      // Fallback: browser may have resolved public/ URLs
      rel = src.replace(/^(?:https?:\/\/[^/]+)?\/public\//, '');
    } else if (/^(?:https?:\/\/[^/]+)?\/assets\//.test(src)) {
      rel = src.replace(/^(?:https?:\/\/[^/]+)?\//, '');
    } else if (/^public\//.test(src)) {
      // Pandoc rewrites /static/... → public/... for its own resource resolution
      rel = src.slice('public/'.length);
    }
    if (!rel) return null;
    const localPath = path.resolve(publicDir, rel);
    if (!localPath.startsWith(publicDir + path.sep)) return null; // security
    return localPath;
  };

  // Replace all src="..." attributes that resolve to a local file with base64 data URIs
  const result = await (async () => {
    let out = html;
    const matches = [...html.matchAll(/\bsrc="([^"]+)"/g)];
    for (const [fullMatch, src] of matches) {
      const localPath = resolveToLocalPath(src);
      if (!localPath) continue;
      try {
        const data = await fs.promises.readFile(localPath);
        const ext = path.extname(localPath).slice(1).toLowerCase();
        const mime = mimeMap[ext] || "image/octet-stream";
        out = out.replace(fullMatch, `src="data:${mime};base64,${data.toString("base64")}"`);
      } catch { /* file not found, keep original src */ }
    }
    return out;
  })();
  return result;
};

const exportPagedHtmlWithChromium = async ({ html, outputPath, tmpDir }) => {
  const chromiumCmd = await getChromiumCommand();
  if (!chromiumCmd) return { ok: false, reason: "chromium-not-found" };

  const pagedHtmlPath = path.join(tmpDir, "paged-chromium.html");
  const { bodyHtml: rawBodyHtml, embeddedCss } = extractEmbeddedPagedStyles(html);

  // Paged.js sets column-width on .pagedjs_page_content inline styles for its own
  // pagination algorithm (overflowing to CSS column 2 detects when a page is full).
  // The pages are already laid out in the captured HTML, so we don't need this.
  // In Chromium's PDF rendering, column-width creates a CSS multi-column container
  // that can push flex blocks (.md-columns) into the off-screen column 2, making
  // them visually invisible while subsequent text renders correctly in column 1.
  // Only strip column-width from inline style attributes (not from <style> CSS blocks).
  // Strip @page rules from ALL <style> tags in the body HTML.
  // The serialized Paged.js DOM can contain @page rules from the Scientific Layout
  // (e.g. @page { size: A4; margin: 2.1cm 2.1cm 2.1cm 2.5cm; }) that are later in
  // document order than our head <style> block. The last @page rule wins in CSS, so
  // any un-stripped body @page would override our explicit margin: 0 override below,
  // causing Chromium to apply extra CSS page margins. With those margins active,
  // width: 100% on .pagedjs_page only spans the shrunken content area, not full A4.
  // All visual margins already live in the Paged.js DOM structure (.pagedjs_area
  // positioning), so stripping CSS @page margins from the body is safe.
  const bodyHtml = mergeNearEmptyPagedPages(
    stripAtPageFromAllStyleTags(
      rawBodyHtml
        .replace(
          /(<[^>]+\bclass="[^"]*pagedjs_page_content[^"]*"[^>]*\bstyle=")([^"]*)"/gi,
          (match, prefix, styleVal) => prefix + styleVal.replace(/\bcolumn-width\s*:\s*[^;]+;?\s*/gi, '') + '"'
        )
        // Paged.js sets break-before:column on elements that follow flex-column blocks.
        // In Chromium's print context (no multi-column container), break-before:column
        // is treated as break-before:page, creating spurious empty pages.
        // Replace with auto so these elements continue normal page flow.
        .replace(/(<[^>]+\bstyle="[^"]*)\bbreak-before\s*:\s*column\b([^"]*")/gi,
          (match, before, after) => before + 'break-before: auto' + after)
    )
  );

  const hasEmbeddedPagedStyles = Boolean(embeddedCss);
  const printCssPath = path.join(__dirname, "public", "print.css");
  const katexCssPath = path.join(__dirname, "public", "vendor", "katex", "katex.min.css");
  let printCss = "";
  let katexFontFaceCss = "";

  if (!hasEmbeddedPagedStyles) {
    try {
      printCss = await fs.promises.readFile(printCssPath, "utf8");
    } catch {
      app.log.warn("Could not read print.css for chromium export");
    }
  }

  // Embed full KaTeX CSS with file:// rewritten URLs so Chromium can render math correctly.
  // (Previously only @font-face was embedded, but that left display math unstyled.)
  try {
    const rawKatexCss = await fs.promises.readFile(katexCssPath, "utf8");
    const katexDir = path.dirname(katexCssPath);
    katexFontFaceCss = rawKatexCss.replace(/url\((['"]?)([^)'"]+)\1\)/g, (_, q, url) => {
      if (/^(https?:|data:|file:)/.test(url)) return `url(${q}${url}${q})`;
      return `url("file://${path.resolve(katexDir, url)}")`;
    });
  } catch { /* KaTeX CSS not critical */ }

  const inlinedBodyHtml = await inlineLocalImagesForChromium(bodyHtml);

  const wrappedHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <base href="http://127.0.0.1:${process.env.PORT || 3210}/">
  <style>
    ${katexFontFaceCss}
    ${printCss}
    ${embeddedCss}
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      width: 100%;
      height: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-preview-warning { display: none !important; }
    .pagedjs_pages {
      margin: 0 !important;
      padding: 0 !important;
      gap: 0 !important;
      background: #fff !important;
      display: block !important;
    }
    .pagedjs_page {
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
      position: relative;
      width: 100% !important;
      height: 100% !important;
      break-after: page;
      page-break-after: always;
    }
    .pagedjs_page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .pagedjs_margin,
    .pagedjs_margin-top,
    .pagedjs_margin-bottom,
    .pagedjs_margin-left,
    .pagedjs_margin-right {
      z-index: 3;
      position: absolute;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.2;
    }
    .pagedjs_margin::before,
    .pagedjs_margin::after,
    .pagedjs_margin-top::before,
    .pagedjs_margin-top::after,
    .pagedjs_margin-bottom::before,
    .pagedjs_margin-bottom::after,
    .pagedjs_margin-left::before,
    .pagedjs_margin-left::after,
    .pagedjs_margin-right::before,
    .pagedjs_margin-right::after,
    .pagedjs_margin-top-left::before,
    .pagedjs_margin-top-left::after,
    .pagedjs_margin-top-center::before,
    .pagedjs_margin-top-center::after,
    .pagedjs_margin-top-right::before,
    .pagedjs_margin-top-right::after,
    .pagedjs_margin-bottom-left::before,
    .pagedjs_margin-bottom-left::after,
    .pagedjs_margin-bottom-center::before,
    .pagedjs_margin-bottom-center::after,
    .pagedjs_margin-bottom-right::before,
    .pagedjs_margin-bottom-right::after {
      content: none !important;
    }
    .pagedjs_pagebox,
    .pagedjs_area,
    .pagedjs_page_content {
      z-index: 1;
      position: relative;
    }
    /* Disable Paged.js CSS multi-column on page content area.
       Paged.js sets column-width via inline style for its own pagination,
       but Chromium mis-renders flex blocks across CSS columns causing
       wrong visual order (md-columns content appears after subsequent headings).
       column-count:1 would still create a 1-column multi-column container,
       so we need BOTH auto to fully disable multi-column. */
    .pagedjs_page_content {
      column-width: auto !important;
      column-count: auto !important;
      column-fill: initial !important;
    }
    /* Freeze table wrapping for PDF export even when the browser still sends an
       older embedded stylesheet from cache. Thesis tables should wrap at spaces,
       not split long German words mid-token. */
    .print-content table th,
    .print-content table td {
      word-break: normal !important;
      overflow-wrap: normal !important;
      hyphens: manual !important;
      -webkit-hyphens: manual !important;
    }
    /* The serialized paged DOM already has the correct reading order. These
       static-export guards keep KaTeX in its original inline/block flow when
       Chromium paints the frozen pages without the live Paged.js runtime. */
    .print-content p .katex {
      display: inline-block !important;
      white-space: nowrap !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      vertical-align: baseline !important;
    }
    .print-content .katex .katex-html {
      display: inline-block !important;
      white-space: nowrap !important;
    }
    .print-content .katex .katex-mathml {
      display: none !important;
    }
    .print-content .math-block,
    .print-content .math-block.display-math,
    .print-content .katex-display {
      float: none !important;
      clear: both !important;
      position: relative !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
    }
    /* Absolute @page override — must be last in this style block so it wins over
       any @page rules from printCss / embeddedCss above.
       size: 210mm 297mm  → Chromium uses A4 paper (with preferCSSPageSize: true).
       margin: 0          → zero CSS page-box margins; all visual margins are already
                            baked into the Paged.js DOM (.pagedjs_area positioning). */
    @page { size: 210mm 297mm; margin: 0 !important; }
  </style>
</head>
<body>
${inlinedBodyHtml}
</body>
</html>`;

  await fs.promises.writeFile(pagedHtmlPath, wrappedHtml, "utf8");
  const browser = await puppeteer.launch({
    executablePath: chromiumCmd,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(wrappedHtml, { waitUntil: "networkidle0" });
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    });
    await page.emulateMediaType("print");
    await page.pdf({
      path: outputPath,
      scale: 1,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });
    return { ok: true };
  } finally {
    await browser.close();
  }
};

const exportWithPandoc = async (req, reply, format) => {
  const { markdown, title, html, paged, requireChromiumPaged } = req.body || {};
  const hasHtml = typeof html === "string" && html.trim();
  if (!hasHtml && (!markdown || typeof markdown !== "string")) {
    reply.code(400);
    return { error: "Markdown required" };
  }

  const pandocAvailable = await checkPandoc();
  if (!pandocAvailable) {
    reply.code(501);
    return { error: "Pandoc not installed" };
  }

  let pdfEngine = null;
  if (format === "pdf") {
    pdfEngine = await getPdfEngine(hasHtml);
    if (!pdfEngine) {
      reply.code(501);
      return { error: "PDF export requires a LaTeX engine (pdflatex/xelatex/lualatex) or wkhtmltopdf." };
    }
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "md-export-"));
  
  try {
    let citationSpec = null;
    if (typeof markdown === "string" && markdown.trim()) {
      try {
        citationSpec = buildCitationSpec(markdown, { tmpDir });
      } catch (error) {
        reply.code(error?.statusCode || 400);
        return { error: error?.message || "Invalid citation metadata" };
      }
    }

    const safeTitle = (title || deriveTitle(markdown || ""))
      .replace(/[^a-z0-9-_]+/gi, "-")
      .substring(0, 100)
      .toLowerCase();
    const outputName = `${safeTitle || "export"}.${format}`;
    const outputPath = path.join(tmpDir, outputName);

    if (format === "pdf" && paged && hasHtml) {
      try {
        const chromiumResult = await exportPagedHtmlWithChromium({
          html,
          outputPath,
          tmpDir
        });
        if (chromiumResult.ok) {
          reply.header("X-Export-Engine", "chromium");
          const stream = fs.createReadStream(outputPath);
          reply.header("Content-Disposition", `attachment; filename=\"${outputName}\"`);
          reply.type("application/pdf");
          return reply.send(stream);
        }
        if (requireChromiumPaged) {
          reply.code(503);
          return { error: chromiumResult.reason || "Chromium paged export unavailable" };
        }
        app.log.info({ reason: chromiumResult.reason }, "Chromium paged export unavailable, using fallback");
      } catch (err) {
        if (requireChromiumPaged) {
          reply.code(503);
          return { error: err?.message || String(err) };
        }
        app.log.warn({ err: err?.message || String(err) }, "Chromium paged export failed, using fallback");
      }
    }

    if (format === "pdf" && paged && hasHtml) {
      const wkhtmlAvailable = await checkCommand("wkhtmltopdf");
      if (wkhtmlAvailable) {
        const pagedHtmlPath = path.join(tmpDir, "paged.html");
        
        // Read print.css for content styling only (not @page rules)
        const printCssPath = path.join(__dirname, "public", "print.css");
        let printCss = "";
        try {
          const fullCss = await fs.promises.readFile(printCssPath, "utf8");
          // Remove @page rules - they don't work in wkhtmltopdf with our structure
          printCss = fullCss.replace(/@page[^}]*\{[^}]*\}/g, '');
        } catch (err) {
          app.log.warn("Could not read print.css, using fallback styles");
        }
        
        const pagedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    /* Base reset */
    * { box-sizing: border-box; }
    html, body { 
      margin: 0; 
      padding: 0; 
      background: #fff;
      width: 210mm;
      height: auto;
    }
    
    /* Hide preview warnings */
    .print-preview-warning { display: none !important; }
    
    /* Paged.js container - remove any spacing */
    .pagedjs_pages { 
      margin: 0 !important; 
      padding: 0 !important; 
      background: #fff !important;
      width: 210mm !important;
    }
    
    /* Each page - A4 dimensions with forced page breaks */
    .pagedjs_page {
      width: 210mm !important;
      min-height: 297mm !important;
      height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    
    .pagedjs_page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    
    /* Page content area with proper margins (matching print.css @page margins) */
    .pagedjs_page_content {
      position: absolute;
      top: 2.5cm;      /* @page margin-top */
      right: 2cm;      /* @page margin-right */
      bottom: 2cm;     /* @page margin-bottom */
      left: 2.5cm;     /* @page margin-left */
      width: auto;
      height: auto;
    }
    
    /* First page - larger top margin */
    .pagedjs_first_page .pagedjs_page_content {
      top: 4cm;
    }
    
    /* Left pages */
    .pagedjs_left_page .pagedjs_page_content {
      left: 3cm;
      right: 2cm;
    }
    
    /* Right pages */
    .pagedjs_right_page .pagedjs_page_content {
      left: 2cm;
      right: 3cm;
    }
    
    /* Margin boxes - positioned outside content area */
    .pagedjs_margin {
      position: absolute;
      font-size: 10pt;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    /* Top margin area */
    .pagedjs_margin-top {
      top: 0;
      left: 2.5cm;
      right: 2cm;
      height: 2.5cm;
      display: flex;
      align-items: flex-end;
      padding-bottom: 0.5cm;
    }
    
    .pagedjs_first_page .pagedjs_margin-top {
      height: 4cm;
    }
    
    /* Bottom margin area */
    .pagedjs_margin-bottom {
      bottom: 0;
      left: 2.5cm;
      right: 2cm;
      height: 2cm;
      display: flex;
      align-items: flex-start;
      padding-top: 0.5cm;
    }
    
    /* Margin box positioning */
    .pagedjs_margin-top-left,
    .pagedjs_margin-bottom-left {
      text-align: left;
      flex: 1;
    }
    
    .pagedjs_margin-top-center,
    .pagedjs_margin-bottom-center {
      text-align: center;
      flex: 1;
    }
    
    .pagedjs_margin-top-right,
    .pagedjs_margin-bottom-right {
      text-align: right;
      flex: 1;
    }
    
    .pagedjs_margin-content {
      display: block;
      width: 100%;
    }
    
    ${printCss}
  </style>
</head>
<body>
${html}
</body>
</html>`;

        await fs.promises.writeFile(pagedHtmlPath, pagedHtml, "utf8");

        const wkArgs = [
          "--page-size", "A4",
          "--enable-local-file-access",
          "--print-media-type",
          "--margin-top", "0",
          "--margin-right", "0",
          "--margin-bottom", "0",
          "--margin-left", "0",
          "--disable-smart-shrinking",
          "--no-outline",
          "--encoding", "UTF-8",
          "--dpi", "96",
          pagedHtmlPath,
          outputPath
        ];

        const wkProc = spawn("wkhtmltopdf", wkArgs, { stdio: ["ignore", "ignore", "pipe"] });
        let wkStderr = "";
        wkProc.stderr.on("data", (chunk) => {
          wkStderr += chunk.toString();
        });

        const wkCode = await new Promise((resolve) => {
          wkProc.on("close", (code) => resolve(code));
        });

        if (wkCode === 0) {
          reply.header("X-Export-Engine", "wkhtmltopdf");
          const stream = fs.createReadStream(outputPath);
          reply.header("Content-Disposition", `attachment; filename=\"${outputName}\"`);
          reply.type("application/pdf");
          return reply.send(stream);
        }

        app.log.warn({ err: wkStderr.slice(0, 1200) }, "wkhtmltopdf paged export failed, falling back to pandoc");
      }
    }

    const runPandoc = async (inputFile, fromArg, extraArgs = []) => {
      let args = [inputFile, fromArg, ...extraArgs, "-o", outputPath];
      
      // For PDF, use detected engine (prefer wkhtmltopdf for HTML input)
      if (format === "pdf") {
        args.push(`--pdf-engine=${pdfEngine}`);
        // Better handling of images and SVGs (Mermaid diagrams)
        if (pdfEngine !== "wkhtmltopdf") {
          args.push("-V", "geometry:margin=1in");
          args.push("-V", "graphics=true");
          args.push("--dpi=300");
        }
      }
      
      const proc = spawn("pandoc", args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      return new Promise((resolve) => {
        proc.on("close", (code) => resolve({ code, stderr }));
      });
    };

    let exitCode = 1;
    let lastError = "";
    const shouldUseHtmlExport = hasHtml && !(citationSpec?.isCitationDocument && (format === "docx" || !paged));
    if (shouldUseHtmlExport) {
      const htmlPath = path.join(tmpDir, "input.html");
      await fs.promises.writeFile(htmlPath, html, "utf8");
      app.log.info({ htmlLength: html.length, hasImages: html.includes('<img') }, "Trying HTML export");
      const result = await runPandoc(htmlPath, "--from=html");
      exitCode = result.code;
      lastError = result.stderr || lastError;
      app.log.info({ exitCode, stderrLength: lastError.length }, "HTML export result");
      if (exitCode !== 0) {
        app.log.warn({ stderr: lastError.slice(0, 500) }, "HTML export failed, trying markdown fallback");
      }
    }

    if (exitCode !== 0 && markdown && typeof markdown === "string") {
      const mdPath = path.join(tmpDir, "input.md");
      const markdownForExport = citationSpec?.isCitationDocument
        ? citationSpec.normalizedMarkdown
        : rewriteMarkdownResourcePathsForPandoc(markdown);
      await fs.promises.writeFile(mdPath, markdownForExport, "utf8");
      app.log.info("Trying markdown export as fallback");
      let result = await runPandoc(
        mdPath,
        citationSpec?.isCitationDocument ? citationSpec.pandocFromArg : "--from=gfm",
        citationSpec?.isCitationDocument ? citationSpec.pandocArgs : []
      );

      if (
        format === "pdf"
        && pdfEngine === "wkhtmltopdf"
        && result.code !== 0
        && isWkhtmlUnicodeMetadataError(result.stderr)
      ) {
        const fallbackEngine = await getPdfFallbackEngine(pdfEngine);
        if (fallbackEngine) {
          app.log.warn(
            { currentEngine: pdfEngine, fallbackEngine },
            "wkhtmltopdf failed on unicode metadata, retrying markdown PDF export with fallback engine"
          );
          pdfEngine = fallbackEngine;
          result = await runPandoc(
            mdPath,
            citationSpec?.isCitationDocument ? citationSpec.pandocFromArg : "--from=gfm",
            citationSpec?.isCitationDocument ? citationSpec.pandocArgs : []
          );
        }
      }

      exitCode = result.code;
      lastError = result.stderr || lastError;
    }

    if (exitCode !== 0) {
      if (lastError) {
        app.log.error({ err: lastError }, "Pandoc export failed");
      } else {
        app.log.error("Pandoc export failed without stderr output");
      }
      reply.code(500);
      const detail = lastError ? lastError.trim().slice(0, 1200) : "";
      return { error: "Export failed", mode: hasHtml ? "html" : "markdown", code: exitCode, detail };
    }

    const stream = fs.createReadStream(outputPath);
    if (format === "pdf") {
      reply.header("X-Export-Engine", pdfEngine || "unknown");
    }
    reply.header("Content-Disposition", `attachment; filename=\"${outputName}\"`);
    reply.type(format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    return reply.send(stream);
  } finally {
    // Cleanup temp directory
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      app.log.warn({ err: cleanupErr, tmpDir }, "Failed to cleanup temp directory");
    }
  }
};

const checkPandoc = async () => {
  return new Promise((resolve) => {
    const proc = spawn("pandoc", ["--version"], { stdio: "ignore" });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
};

const checkCommand = async (cmd) => {
  return new Promise((resolve) => {
    const proc = spawn(cmd, ["--version"], { stdio: "ignore" });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
};

const resolveCommandPath = async (cmd) => {
  if (!cmd || cmd.includes("/")) {
    return cmd || null;
  }

  return new Promise((resolve) => {
    const proc = spawn("which", [cmd], { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.on("error", () => resolve(null));
    proc.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      const resolved = stdout.split(/\r?\n/)[0]?.trim();
      resolve(resolved || null);
    });
  });
};

const getAvailableCommand = async (candidates, { resolvePath = false } = {}) => {
  for (const cmd of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkCommand(cmd);
    if (ok) {
      if (!resolvePath) {
        return cmd;
      }

      // eslint-disable-next-line no-await-in-loop
      return (await resolveCommandPath(cmd)) || cmd;
    }
  }
  return null;
};

const getChromiumCommand = async () => getAvailableCommand([
  process.env.CHROMIUM_BIN,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.BROWSER_EXECUTABLE_PATH,
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable",
  "microsoft-edge",
  "microsoft-edge-stable",
  "/snap/bin/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/microsoft-edge",
  "/usr/bin/microsoft-edge-stable",
  "/opt/microsoft/msedge/msedge"
].filter(Boolean), { resolvePath: true });

const getPdfEngine = async (preferHtmlEngine = false) => {
  const candidates = preferHtmlEngine
    ? ["wkhtmltopdf", "xelatex", "lualatex", "pdflatex"]
    : ["wkhtmltopdf", "xelatex", "lualatex", "pdflatex"];
  for (const cmd of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkCommand(cmd);
    if (ok) return cmd;
  }
  return null;
};

const getPdfFallbackEngine = async (currentEngine) => {
  const candidates = ["xelatex", "lualatex", "pdflatex"].filter((cmd) => cmd !== currentEngine);
  for (const cmd of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await checkCommand(cmd);
    if (ok) return cmd;
  }
  return null;
};

const isWkhtmlUnicodeMetadataError = (stderr) => /wkhtmltopdf:.*recoverEncode: invalid argument \(invalid character\)/i.test(String(stderr || ""));

app.get("/health", async () => ({ ok: true }));

app.get("/stats", async (req, reply) => {
  if (!STATS_PAGE_ENABLED) {
    reply.code(404);
    return { error: "Not found" };
  }
  reply.type("text/html; charset=utf-8");
  return renderStatsPage();
});

app.get("/api/version", async () => {
  const pkg = JSON.parse(await fs.promises.readFile(path.join(__dirname, "package.json"), "utf8"));
  return { version: pkg.version, name: pkg.name };
});

// Serve static files manually (since we can't use wildcard prefix)
const serveStatic = async (req, reply, filename) => {
  try {
    const filePath = path.join(__dirname, "public", filename);
    const content = await fs.promises.readFile(filePath);
    const stats = await fs.promises.stat(filePath);
    const ext = path.extname(filename);
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".txt": "text/plain; charset=utf-8",
      ".xml": "application/xml; charset=utf-8",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".png": "image/png"
    };
    reply.type(mimeTypes[ext] || "application/octet-stream");
    reply.header("Cache-Control", "no-cache, must-revalidate");
    reply.header("Last-Modified", stats.mtime.toUTCString());
    return content;
  } catch (err) {
    reply.code(404);
    return { error: "Not found" };
  }
};

app.get("/styles.css", async (req, reply) => serveStatic(req, reply, "styles.css"));
app.get("/print.css", async (req, reply) => serveStatic(req, reply, "print.css"));
app.get("/app.js", async (req, reply) => serveStatic(req, reply, "app.js"));
app.get("/favicon.svg", async (req, reply) => serveStatic(req, reply, "favicon.svg"));
app.get("/favicon.ico", async (req, reply) => serveStatic(req, reply, "brand/mdedit-icon.png"));
app.get("/robots.txt", async (req, reply) => serveStatic(req, reply, "robots.txt"));
app.get("/sitemap.xml", async (req, reply) => serveStatic(req, reply, "sitemap.xml"));
app.get("/tips.json", async (req, reply) => serveStatic(req, reply, "tips.json"));
app.get("/tips-en.json", async (req, reply) => serveStatic(req, reply, "tips-en.json"));

app.get("/modules/:filename", async (req, reply) => 
  serveStatic(req, reply, `modules/${req.params.filename}`)
);

app.get("/i18n/:filename", async (req, reply) => 
  serveStatic(req, reply, `i18n/${req.params.filename}`)
);

app.get("/help.html", async (req, reply) => serveStatic(req, reply, "help.html"));
app.get("/help-en.html", async (req, reply) => serveStatic(req, reply, "help-en.html"));

// Root path
app.get("/", async (req, reply) => {
  const html = await readIndexHtml();
  reply.type("text/html; charset=utf-8");
  return html;
});

// Permalink route - handles UUIDs
app.get("/:id", async (req, reply) => {
  const pasteId = req.params.id;
  
  // Check if it's a UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pasteId)) {
    // Check if paste exists
    const row = db.prepare("SELECT id FROM pastes WHERE id = ?").get(pasteId);
    if (row) {
      // Serve index.html - frontend will load the paste
      const html = await readIndexHtml();
      reply.type("text/html; charset=utf-8");
      return html;
    }
  }
  
  // Not a valid UUID or paste not found
  reply.code(404);
  return { error: "Not found" };
});

// ── Database cleanup with disk-aware and per-user-quota strategies ──────────
// Runs on startup and every 6 hours.
// 
// Cleanup tiers based on available disk space and per-session storage:
// NORMAL    (>10% free): Delete sessions older than SESSION_TTL_DAYS
// MEDIUM    (5-10% free): + Limit each session to MAX_PASTES_MEDIUM recent pastes
// AGGRESSIVE (<5% free): + Limit each session to MAX_PASTES_AGGRESSIVE + lower per-user quota

// Get total markdown size for a session in MB
const getSessionMarkdownSizeMB = (sessionId) => {
  const result = db.prepare(
    "SELECT SUM(LENGTH(markdown)) as total FROM pastes WHERE session_id = ?"
  ).get(sessionId);
  return (result?.total || 0) / 1024 / 1024;
};

const pruneDatabase = async () => {
  try {
    const diskFreePercent = getDiskFreePercent();
    const isCritical = diskFreePercent <= STORAGE_GUARD.DISK_CRITICAL_PERCENT;
    const isMedium = diskFreePercent <= STORAGE_GUARD.DISK_WARN_PERCENT && !isCritical;
    const cleanupMode = isCritical ? "AGGRESSIVE" : (isMedium ? "MEDIUM" : "NORMAL");

    // Phase 1: Always prune sessions older than SESSION_TTL_DAYS
    const cutoff = new Date(Date.now() - STORAGE_GUARD.SESSION_TTL_DAYS * 86_400_000).toISOString();
    const stalePasteIds = db.prepare(
      "SELECT id FROM pastes WHERE session_id IN (SELECT id FROM sessions WHERE last_seen < ?)"
    ).all(cutoff);
    for (const { id } of stalePasteIds) {
      deletePasteRelatedRecords(id);
    }
    const stalePastes = db.prepare(
      "DELETE FROM pastes WHERE session_id IN (SELECT id FROM sessions WHERE last_seen < ?)"
    ).run(cutoff);
    const staleSessions = db.prepare(
      "DELETE FROM sessions WHERE last_seen < ?"
    ).run(cutoff);

    let deletedPhase2 = 0;
    let deletedPhase3 = 0;

    // Get all remaining sessions for quota/limit checks
    const allSessions = db.prepare("SELECT id FROM sessions").all();

    // Phase 2: If disk is medium/critical, limit pastes per session
    if (isMedium || isCritical) {
      const maxPastes = isCritical ? STORAGE_GUARD.MAX_PASTES_AGGRESSIVE : STORAGE_GUARD.MAX_PASTES_MEDIUM;
      for (const { id: sessionId } of allSessions) {
        const pastesPerSession = db.prepare(
          "SELECT COUNT(*) as count FROM pastes WHERE session_id = ?"
        ).get(sessionId).count;

        if (pastesPerSession > maxPastes) {
          const removablePastes = db.prepare(
            `SELECT id FROM pastes WHERE session_id = ? AND id NOT IN
             (SELECT id FROM pastes WHERE session_id = ? ORDER BY created_at DESC LIMIT ?)
             ORDER BY created_at ASC LIMIT ?`
          ).all(sessionId, sessionId, maxPastes, pastesPerSession - maxPastes);
          for (const { id } of removablePastes) {
            deletePasteRelatedRecords(id);
            db.prepare("DELETE FROM pastes WHERE id = ?").run(id);
            deletedPhase2++;
          }
        }
      }
    }

    // Phase 3: If disk is critical, enforce per-session quota with headroom
    if (isCritical) {
      const quotaMB = STORAGE_GUARD.USER_QUOTA_MB / 2; // Halved quota when critical
      for (const { id: sessionId } of allSessions) {
        let totalSizeMB = 0;
        const pastes = db.prepare(
          "SELECT id, LENGTH(markdown) as size FROM pastes WHERE session_id = ? ORDER BY created_at DESC"
        ).all(sessionId);

        for (const { id: pasteId, size } of pastes) {
          const pasteSizeMB = size / 1024 / 1024;
          if (totalSizeMB + pasteSizeMB > quotaMB) {
            deletePasteRelatedRecords(pasteId);
            db.prepare("DELETE FROM pastes WHERE id = ?").run(pasteId);
            deletedPhase3++;
          } else {
            totalSizeMB += pasteSizeMB;
          }
        }
      }
    }

    // Phase 4: Always remove orphaned pastes (session already deleted)
    const orphanPasteIds = db.prepare(
      "SELECT id FROM pastes WHERE session_id NOT IN (SELECT id FROM sessions)"
    ).all();
    for (const { id } of orphanPasteIds) {
      deletePasteRelatedRecords(id);
    }
    const orphanPastes = db.prepare(
      "DELETE FROM pastes WHERE session_id NOT IN (SELECT id FROM sessions)"
    ).run();

    const orphanSnapshots = db.prepare(
      "DELETE FROM collab_snapshots WHERE paste_id NOT IN (SELECT id FROM pastes)"
    ).run();
    const orphanSettings = db.prepare(
      "DELETE FROM collab_settings WHERE paste_id NOT IN (SELECT id FROM pastes)"
    ).run();
    const orphanMembers = db.prepare(
      "DELETE FROM collab_members WHERE paste_id NOT IN (SELECT id FROM pastes)"
    ).run();
    const orphanThreads = db.prepare(
      "DELETE FROM collab_chat_threads WHERE paste_id NOT IN (SELECT id FROM pastes)"
    ).run();
    const orphanMessagesByThread = db.prepare(
      "DELETE FROM collab_chat_messages WHERE thread_id NOT IN (SELECT id FROM collab_chat_threads)"
    ).run();
    const orphanMessagesByMember = db.prepare(
      "DELETE FROM collab_chat_messages WHERE member_id NOT IN (SELECT id FROM collab_members)"
    ).run();

    // Phase 5: Cleanup orphaned asset directories
    let deletedAssets = 0;
    try {
      if (await fs.promises.stat(IMAGE_CONFIG.ASSETS_DIR).catch(() => null)) {
        const assetDirs = await fs.promises.readdir(IMAGE_CONFIG.ASSETS_DIR);
        for (const dir of assetDirs) {
          const pasteExists = db.prepare("SELECT id FROM pastes WHERE id = ?").get(dir);
          if (!pasteExists) {
            const assetPath = path.join(IMAGE_CONFIG.ASSETS_DIR, dir);
            await fs.promises.rm(assetPath, { recursive: true, force: true });
            deletedAssets++;
          }
        }
      }
    } catch (err) {
      app.log.warn({ err: err.message }, "Asset cleanup encountered error");
    }

    // Log only if something was deleted
    if (stalePastes.changes > 0 || staleSessions.changes > 0 ||
        deletedPhase2 > 0 || deletedPhase3 > 0 || orphanPastes.changes > 0 ||
        orphanSnapshots.changes > 0 || orphanSettings.changes > 0 || orphanMembers.changes > 0 ||
        orphanThreads.changes > 0 || orphanMessagesByThread.changes > 0 || orphanMessagesByMember.changes > 0 ||
        deletedAssets > 0) {
      app.log.info(
        {
          diskFreePercent: diskFreePercent.toFixed(1),
          cleanupMode,
          sessionsDeleted: staleSessions.changes,
          pastesDeletedAge: stalePastes.changes,
          pastesDeletedLimit: deletedPhase2,
          pastesDeletedQuota: deletedPhase3,
          orphanedPastes: orphanPastes.changes,
          orphanedSnapshots: orphanSnapshots.changes,
          orphanedSettings: orphanSettings.changes,
          orphanedMembers: orphanMembers.changes,
          orphanedThreads: orphanThreads.changes,
          orphanedMessages: orphanMessagesByThread.changes + orphanMessagesByMember.changes,
          assetDirsDeleted: deletedAssets
        },
        "Database cleanup completed"
      );
    }
  } catch (err) {
    app.log.error({ err: err.message }, "DB cleanup failed");
  }
};

// ── Collaborative Editing ──────────────────────────────────────────────────

// Helper: Fantasy Names
const FANTASY_NAMES = [
  "Kreativer Phönix", "Schreibender Drache", "Mutige Ameise", "Sanfte Giraffe",
  "Schneller Fuchs", "Weiser Eule", "Frecher Rabe", "Stolzer Adler",
  "Vorsichtiger Igel", "Fauler Koala", "Munterer Otter", "Starker Bär",
  "Zierliche Schmetteling", "Neugieriges Eichhörnchen", "Graziöser Schwan"
];

const getRandomFantasyName = () => 
  FANTASY_NAMES[Math.floor(Math.random() * FANTASY_NAMES.length)];

const sanitizeCollabDisplayName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 60 ? trimmed : null;
};

const getAvatarColor = (id) => {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"];
  const charSum = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

// Password API: Set/Update/Remove password
app.post("/api/pastes/:id/collab/password", async (req, reply) => {
  const { password, canRead, canWrite } = req.body || {};
  
  const paste = db.prepare(
    "SELECT session_id FROM pastes WHERE id = ? AND session_id = ?"
  ).get(req.params.id, req.sessionId);
  
  if (!paste) {
    reply.code(404);
    return { error: "Paste not found" };
  }

  const ts = nowIso();
  const passwordHash = password ? await bcryptjs.hash(password, 10) : null;
  const normalizedCanWrite = typeof canWrite === "boolean" ? canWrite : true;
  const normalizedCanRead = typeof canRead === "boolean" ? (canRead || normalizedCanWrite) : true;
  
  const existing = db.prepare("SELECT paste_id FROM collab_settings WHERE paste_id = ?").get(req.params.id);
  
  if (existing) {
    db.prepare("UPDATE collab_settings SET password_hash = ?, can_read = ?, can_write = ?, updated_at = ? WHERE paste_id = ?")
      .run(passwordHash, normalizedCanRead ? 1 : 0, normalizedCanWrite ? 1 : 0, ts, req.params.id);
  } else {
    db.prepare(
      "INSERT INTO collab_settings (paste_id, password_hash, can_read, can_write, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(req.params.id, passwordHash, normalizedCanRead ? 1 : 0, normalizedCanWrite ? 1 : 0, ts, ts);
  }
  
  return { ok: true };
});

// Get collab settings (for password check)
app.get("/api/pastes/:id/collab/settings", async (req, reply) => {
  const paste = db.prepare("SELECT id, shared FROM pastes WHERE id = ?").get(req.params.id);
  
  if (!paste || !paste.shared) {
    reply.code(404);
    return { error: "Paste not found or not shared" };
  }

  const settings = db.prepare(
    "SELECT password_hash, can_read, can_write FROM collab_settings WHERE paste_id = ?"
  ).get(req.params.id);
  
  return {
    hasPassword: !!settings?.password_hash,
    canRead: settings?.can_read ?? 1,
    canWrite: settings?.can_write ?? 1
  };
});

// Verify password for accessing shared paste
app.post("/api/pastes/:id/collab/verify-password", async (req, reply) => {
  const { password } = req.body || {};
  
  const paste = db.prepare("SELECT id, shared FROM pastes WHERE id = ?").get(req.params.id);
  
  if (!paste || !paste.shared) {
    reply.code(404);
    return { error: "Paste not found" };
  }

  const settings = db.prepare("SELECT password_hash FROM collab_settings WHERE paste_id = ?").get(req.params.id);
  
  if (!settings?.password_hash) {
    return { ok: true };
  }

  if (!password) {
    reply.code(401);
    return { error: "Password required" };
  }

  const isValid = await bcryptjs.compare(password, settings.password_hash);
  
  if (!isValid) {
    reply.code(401);
    return { error: "Invalid password" };
  }

  return { ok: true };
});

// Collab members: Register member when joining
app.post("/api/pastes/:id/collab/join", async (req, reply) => {
  const paste = db.prepare("SELECT id, shared, session_id FROM pastes WHERE id = ?").get(req.params.id);
  
  if (!paste) {
    reply.code(404);
    return { error: "Paste not found" };
  }

  if (!paste.shared) {
    // Private paste - allow only owner
    if (paste.session_id !== req.sessionId) {
      reply.code(403);
      return { error: "Not authorized" };
    }
  }

  // Non-owners must satisfy password + can_read checks
  if (paste.session_id !== req.sessionId) {
    const settings = db.prepare("SELECT password_hash, can_read FROM collab_settings WHERE paste_id = ?").get(req.params.id);

    if (settings?.password_hash) {
      const { password } = req.body || {};
      if (!password) {
        reply.code(401);
        return { error: "Password required" };
      }
      const isValid = await bcryptjs.compare(password, settings.password_hash);
      if (!isValid) {
        reply.code(401);
        return { error: "Invalid password" };
      }
    }

    if (settings && !settings.can_read) {
      reply.code(403);
      return { error: "Read access disabled" };
    }
  }

  const { displayName, memberId: requestedMemberId } = req.body || {};
  const sanitizedDisplayName = sanitizeCollabDisplayName(displayName);
  const ts = nowIso();

  // Reuse existing identity if the client sends a known memberId for this paste
  if (requestedMemberId && typeof requestedMemberId === "string") {
    const existing = db.prepare(
      "SELECT id, fantasy_name, avatar_color FROM collab_members WHERE id = ? AND paste_id = ?"
    ).get(requestedMemberId, req.params.id);

    if (existing) {
      const nextFantasyName = sanitizedDisplayName || existing.fantasy_name;
      db.prepare("UPDATE collab_members SET fantasy_name = ?, last_seen = ? WHERE id = ?")
        .run(nextFantasyName, ts, existing.id);
      return {
        memberId: existing.id,
        fantasyName: nextFantasyName,
        avatarColor: existing.avatar_color
      };
    }
  }

  const memberId = crypto.randomUUID();
  const fantasyName = sanitizedDisplayName || getRandomFantasyName();
  const avatarColor = getAvatarColor(memberId);

  db.prepare(
    "INSERT INTO collab_members (id, paste_id, session_id, fantasy_name, avatar_color, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(memberId, req.params.id, req.sessionId, fantasyName, avatarColor, ts, ts);

  return {
    memberId,
    fantasyName,
    avatarColor
  };
});

app.post("/api/pastes/:id/collab/display-name", async (req, reply) => {
  const paste = db.prepare("SELECT id FROM pastes WHERE id = ?").get(req.params.id);
  if (!paste) {
    reply.code(404);
    return { error: "Paste not found" };
  }

  const { memberId, displayName } = req.body || {};
  const sanitizedDisplayName = sanitizeCollabDisplayName(displayName);
  if (!memberId || typeof memberId !== "string" || !sanitizedDisplayName) {
    reply.code(400);
    return { error: "Valid memberId and displayName required" };
  }

  const member = db.prepare(
    "SELECT id, session_id, avatar_color FROM collab_members WHERE id = ? AND paste_id = ?"
  ).get(memberId, req.params.id);

  if (!member) {
    reply.code(404);
    return { error: "Member not found" };
  }

  if (member.session_id !== req.sessionId) {
    reply.code(403);
    return { error: "Not authorized" };
  }

  const ts = nowIso();
  db.prepare("UPDATE collab_members SET fantasy_name = ?, last_seen = ? WHERE id = ? AND paste_id = ?")
    .run(sanitizedDisplayName, ts, memberId, req.params.id);

  broadcastToClients(req.params.id, {
    type: "member-updated",
    memberId,
    fantasyName: sanitizedDisplayName,
    avatarColor: member.avatar_color
  }, memberId);

  return {
    memberId,
    fantasyName: sanitizedDisplayName,
    avatarColor: member.avatar_color
  };
});

// Get current members (presence)
app.get("/api/pastes/:id/collab/members", async (req, reply) => {
  const access = requirePasteCollabAccess(req, reply);
  if (!access?.paste) {
    return access;
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const members = db.prepare(
    "SELECT id, fantasy_name, avatar_color FROM collab_members WHERE paste_id = ? AND last_seen > ? ORDER BY created_at DESC"
  ).all(req.params.id, fiveMinutesAgo);

  return { members };
});

// Snapshots: Get recent snapshots
app.get("/api/pastes/:id/collab/snapshots", async (req, reply) => {
  const access = requirePasteCollabAccess(req, reply);
  if (!access?.paste) {
    return access;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const snapshots = db.prepare(
    "SELECT id, created_at FROM collab_snapshots WHERE paste_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 50"
  ).all(req.params.id, sevenDaysAgo);

  return { snapshots };
});

// Restore from snapshot
app.post("/api/pastes/:id/collab/restore", async (req, reply) => {
  const { snapshotId } = req.body || {};
  
  const paste = db.prepare(
    "SELECT id, session_id FROM pastes WHERE id = ?"
  ).get(req.params.id);
  
  if (!paste || paste.session_id !== req.sessionId) {
    reply.code(403);
    return { error: "Not authorized" };
  }

  const snapshot = db.prepare(
    "SELECT markdown FROM collab_snapshots WHERE id = ? AND paste_id = ?"
  ).get(snapshotId, req.params.id);
  
  if (!snapshot) {
    reply.code(404);
    return { error: "Snapshot not found" };
  }

  const currentPaste = db.prepare(
    "SELECT LENGTH(markdown) as size FROM pastes WHERE id = ?"
  ).get(req.params.id);
  const deltaBytes = Math.max(Buffer.byteLength(snapshot.markdown, "utf8") - Number(currentPaste?.size || 0), 0);
  const storageCheck = await requireStorageHeadroom(reply, deltaBytes);
  if (storageCheck !== true) {
    return storageCheck;
  }

  const ts = nowIso();
  db.prepare("UPDATE pastes SET markdown = ?, updated_at = ? WHERE id = ?")
    .run(snapshot.markdown, ts, req.params.id);

  return { ok: true };
});

// WebSocket: Collaborative editing
const connectedClients = new Map(); // Map<pasteId, Map<memberId, rawWebSocket>>

app.register(async (fastify) => {
  fastify.get("/api/pastes/:id/collab/ws", { websocket: true }, (connection, req) => {
    const ws = connection.socket; // raw WebSocket – has readyState and send()
    const pasteId = req.params.id;
    const memberId = req.query?.memberId || crypto.randomUUID();
    const access = getPasteAccess(pasteId, req.sessionId);
    const member = getOwnedCollabMember(pasteId, memberId, req.sessionId);

    if (!access || !member) {
      ws.close(1008, "Not authorized");
      return;
    }

    if (!connectedClients.has(pasteId)) {
      connectedClients.set(pasteId, new Map());
    }
    
    const clients = connectedClients.get(pasteId);
    clients.set(memberId, ws);

    // Announce join
    broadcastToClients(pasteId, {
      type: "member-joined",
      memberId,
      fantasyName: member.fantasy_name,
      avatarColor: member.avatar_color
    }, memberId);

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        await handleCollabMessage(pasteId, memberId, msg);
      } catch (e) {
        app.log.warn({ err: e.message }, "WebSocket message parse error");
      }
    });

    ws.on("close", () => {
      clients.delete(memberId);
      if (clients.size === 0) {
        connectedClients.delete(pasteId);
      }
      broadcastToClients(pasteId, {
        type: "member-left",
        memberId
      });
    });
  });
});

const broadcastToClients = (pasteId, message, excludeMemberId = null) => {
  const clients = connectedClients.get(pasteId);
  if (!clients) return;

  const data = JSON.stringify(message);
  for (const [memberId, socket] of clients) {
    if (memberId !== excludeMemberId && socket.readyState === 1) {
      socket.send(data);
    }
  }
};

const handleCollabMessage = async (pasteId, memberId, message) => {
  const { type, content } = message;
  const ts = nowIso();

  db.prepare("UPDATE collab_members SET last_seen = ? WHERE id = ? AND paste_id = ?")
    .run(ts, memberId, pasteId);

  if (type === "edit") {
    const member = db.prepare("SELECT session_id FROM collab_members WHERE id = ? AND paste_id = ?").get(memberId, pasteId);
    const paste = db.prepare("SELECT session_id FROM pastes WHERE id = ?").get(pasteId);
    const settings = db.prepare("SELECT can_write FROM collab_settings WHERE paste_id = ?").get(pasteId);
    const canWrite = settings?.can_write ?? 1;

    if (!canWrite && member?.session_id !== paste?.session_id) {
      return;
    }
  }

  if (type === "edit") {
    // Save snapshot every 30 seconds (simplified - not per-message)
    const lastSnapshot = db.prepare(
      "SELECT created_at FROM collab_snapshots WHERE paste_id = ? ORDER BY created_at DESC LIMIT 1"
    ).get(pasteId);

    const now = Date.now();
    const lastSnapshotTime = lastSnapshot ? new Date(lastSnapshot.created_at).getTime() : 0;
    
    if (now - lastSnapshotTime > 30000) {
      const storageAssessment = assessStorageHeadroom(Buffer.byteLength(String(content || ""), "utf8"));
      if (!storageAssessment.isLow) {
        db.prepare(
          "INSERT INTO collab_snapshots (id, paste_id, markdown, created_at, created_by_member_id) VALUES (?, ?, ?, ?, ?)"
        ).run(crypto.randomUUID(), pasteId, content, ts, memberId);
      } else {
        app.log.warn({ pasteId }, "Skipped collab snapshot due to low disk headroom");
      }
    }

    // Broadcast edit
    broadcastToClients(pasteId, {
      type: "edit",
      content,
      memberId
    }, memberId);
  } else if (type === "cursor") {
    // Broadcast cursor position
    broadcastToClients(pasteId, {
      type: "cursor",
      position: message.position,
      memberId
    }, memberId);
  } else if (type === "chat") {
    const storageAssessment = assessStorageHeadroom(Buffer.byteLength(String(content || ""), "utf8"));
    if (storageAssessment.isLow) {
      app.log.warn({ pasteId }, "Skipped collab chat persistence due to low disk headroom");
      return;
    }

    // Save chat message
    const threadId = message.threadId;
    const msgId = crypto.randomUUID();
    
    db.prepare(
      "INSERT INTO collab_chat_messages (id, thread_id, member_id, message, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(msgId, threadId, memberId, content, ts);

    broadcastToClients(pasteId, {
      type: "chat",
      threadId,
      messageId: msgId,
      memberId,
      content,
      timestamp: ts
    });
  }
};

// Chat threads
app.post("/api/pastes/:id/collab/chat/threads", async (req, reply) => {
  const access = requirePasteCollabAccess(req, reply);
  if (!access?.paste) {
    return access;
  }

  const { title } = req.body || {};

  if (!title || typeof title !== "string" || title.length === 0 || title.length > 200) {
    reply.code(400);
    return { error: "Invalid title" };
  }

  const storageCheck = await requireStorageHeadroom(reply, Buffer.byteLength(title.trim(), "utf8"));
  if (storageCheck !== true) {
    return storageCheck;
  }

  const threadId = crypto.randomUUID();
  const ts = nowIso();
  const { memberId: creatorMemberId } = req.body || {};

  const creator = creatorMemberId
    ? getOwnedCollabMember(req.params.id, creatorMemberId, req.sessionId)
    : null;

  if (creatorMemberId && !creator) {
    reply.code(403);
    return { error: "Not authorized" };
  }

  db.prepare(
    "INSERT INTO collab_chat_threads (id, paste_id, title, created_at, created_by_member_id) VALUES (?, ?, ?, ?, ?)"
  ).run(threadId, req.params.id, title, ts, creator?.id ?? null);

  broadcastToClients(req.params.id, {
    type: "chat-thread-created",
    threadId,
    title,
    timestamp: ts
  });

  return { threadId, title };
});

// Get chat threads
app.get("/api/pastes/:id/collab/chat/threads", async (req, reply) => {
  const access = requirePasteCollabAccess(req, reply);
  if (!access?.paste) {
    return access;
  }

  const threads = db.prepare(
    "SELECT id, title, created_at FROM collab_chat_threads WHERE paste_id = ? ORDER BY created_at DESC"
  ).all(req.params.id);

  return { threads };
});

// Get chat messages for thread
app.get("/api/pastes/:id/collab/chat/threads/:threadId/messages", async (req, reply) => {
  const access = requirePasteCollabAccess(req, reply);
  if (!access?.paste) {
    return access;
  }

  const { threadId } = req.params;
  
  const thread = db.prepare(
    "SELECT paste_id FROM collab_chat_threads WHERE id = ?"
  ).get(threadId);
  
  if (!thread || thread.paste_id !== req.params.id) {
    reply.code(404);
    return { error: "Thread not found" };
  }

  const messages = db.prepare(`
    SELECT m.id, m.member_id, m.message, m.created_at, mb.fantasy_name, mb.avatar_color
    FROM collab_chat_messages m
    LEFT JOIN collab_members mb ON m.member_id = mb.id
    WHERE m.thread_id = ?
    ORDER BY m.created_at ASC
  `).all(threadId);

  return { messages };
});

app.post("/api/pastes/:id/collab/chat/threads/:threadId/messages", async (req, reply) => {
  const access = requirePasteCollabAccess(req, reply);
  if (!access?.paste) {
    return access;
  }

  const { threadId } = req.params;
  const { memberId, message } = req.body || {};

  const thread = db.prepare(
    "SELECT paste_id FROM collab_chat_threads WHERE id = ?"
  ).get(threadId);

  if (!thread || thread.paste_id !== req.params.id) {
    reply.code(404);
    return { error: "Thread not found" };
  }

  if (!memberId || typeof memberId !== "string") {
    reply.code(400);
    return { error: "Invalid member" };
  }

  if (!message || typeof message !== "string" || !message.trim()) {
    reply.code(400);
    return { error: "Invalid message" };
  }

  if (message.trim().length > 4000) {
    reply.code(413);
    return { error: "Message too long (max 4000 chars)" };
  }

  const storageCheck = await requireStorageHeadroom(reply, Buffer.byteLength(message.trim(), "utf8"));
  if (storageCheck !== true) {
    return storageCheck;
  }

  const member = getOwnedCollabMember(req.params.id, memberId, req.sessionId);

  if (!member) {
    reply.code(403);
    return { error: "Not authorized" };
  }

  const msgId = crypto.randomUUID();
  const ts = nowIso();
  const content = message.trim();

  db.prepare(
    "INSERT INTO collab_chat_messages (id, thread_id, member_id, message, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(msgId, threadId, memberId, content, ts);

  broadcastToClients(req.params.id, {
    type: "chat",
    threadId,
    messageId: msgId,
    memberId,
    memberName: member.fantasy_name,
    content,
    timestamp: ts
  });

  return { messageId: msgId, timestamp: ts };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT || 3210);
    await app.listen({ port, host: "0.0.0.0" });
    if (STATS_PAGE_ENABLED) {
      app.log.info({ statsUrl: "/stats" }, "Stats endpoint ready");
    }
    pruneDatabase();
    setInterval(pruneDatabase, 6 * 60 * 60 * 1000); // every 6 hours
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
