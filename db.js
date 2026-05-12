import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || __dirname;
const dbPath = path.join(dataDir, "data.sqlite");

const db = new Database(dbPath);

// WAL mode for concurrent reads + performance tuning
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL"); // Faster writes, still safe with WAL
db.pragma("cache_size = -64000"); // 64MB cache
db.pragma("temp_store = MEMORY"); // Temp tables in RAM
db.pragma("mmap_size = 268435456"); // 256MB memory-mapped I/O

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pastes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  shared_at TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  paste_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (paste_id) REFERENCES pastes(id)
);

CREATE TABLE IF NOT EXISTS marketing_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  surface TEXT NOT NULL,
  path TEXT NOT NULL,
  target TEXT,
  referrer_host TEXT,
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
`);

// Migration: Add 'shared' column if it doesn't exist
const checkShared = db.prepare("SELECT COUNT(*) as count FROM pragma_table_info('pastes') WHERE name='shared'");
const hasShared = checkShared.get().count > 0;

if (!hasShared) {
  db.exec("ALTER TABLE pastes ADD COLUMN shared INTEGER NOT NULL DEFAULT 0");
  console.log("✅ Migration: Added 'shared' column to pastes table");
}

const checkSharedAt = db.prepare("SELECT COUNT(*) as count FROM pragma_table_info('pastes') WHERE name='shared_at'");
const hasSharedAt = checkSharedAt.get().count > 0;

if (!hasSharedAt) {
  db.exec("ALTER TABLE pastes ADD COLUMN shared_at TEXT");
  db.exec("UPDATE pastes SET shared_at = created_at WHERE shared = 1 AND shared_at IS NULL");
  console.log("✅ Migration: Added 'shared_at' column to pastes table");
}

// Migration: Create images table if it doesn't exist
const checkImages = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='images'");
const hasImages = checkImages.get().count > 0;

if (!hasImages) {
  db.exec(`
    CREATE TABLE images (
      id TEXT PRIMARY KEY,
      paste_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (paste_id) REFERENCES pastes(id)
    );
    CREATE INDEX idx_images_paste_id ON images(paste_id);
  `);
  console.log("✅ Migration: Created images table");
}

// Migration: Create collab tables
const checkCollabSettings = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='collab_settings'");
const hasCollabSettings = checkCollabSettings.get().count > 0;

if (!hasCollabSettings) {
  db.exec(`
    CREATE TABLE collab_settings (
      paste_id TEXT PRIMARY KEY,
      password_hash TEXT,
      can_read INTEGER NOT NULL DEFAULT 1,
      can_write INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (paste_id) REFERENCES pastes(id)
    );

    CREATE TABLE collab_members (
      id TEXT PRIMARY KEY,
      paste_id TEXT NOT NULL,
      session_id TEXT,
      fantasy_name TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (paste_id) REFERENCES pastes(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE collab_snapshots (
      id TEXT PRIMARY KEY,
      paste_id TEXT NOT NULL,
      markdown TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_member_id TEXT,
      FOREIGN KEY (paste_id) REFERENCES pastes(id),
      FOREIGN KEY (created_by_member_id) REFERENCES collab_members(id)
    );

    CREATE TABLE collab_chat_threads (
      id TEXT PRIMARY KEY,
      paste_id TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by_member_id TEXT,
      FOREIGN KEY (paste_id) REFERENCES pastes(id),
      FOREIGN KEY (created_by_member_id) REFERENCES collab_members(id)
    );

    CREATE TABLE collab_chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (thread_id) REFERENCES collab_chat_threads(id),
      FOREIGN KEY (member_id) REFERENCES collab_members(id)
    );

    CREATE INDEX idx_collab_members_paste ON collab_members(paste_id);
    CREATE INDEX idx_collab_members_session ON collab_members(session_id);
    CREATE INDEX idx_collab_snapshots_paste ON collab_snapshots(paste_id, created_at DESC);
    CREATE INDEX idx_collab_chat_threads_paste ON collab_chat_threads(paste_id, created_at DESC);
    CREATE INDEX idx_collab_chat_messages_thread ON collab_chat_messages(thread_id, created_at ASC);
  `);
  console.log("✅ Migration: Created collab tables");
}

// Create indexes (now safe because 'shared' column exists)
db.exec(`
CREATE INDEX IF NOT EXISTS idx_pastes_session_id ON pastes(session_id);
CREATE INDEX IF NOT EXISTS idx_pastes_session_updated ON pastes(session_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pastes_session_created ON pastes(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pastes_shared ON pastes(shared, id);
CREATE INDEX IF NOT EXISTS idx_pastes_shared_at ON pastes(shared, shared_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_images_paste_id ON images(paste_id);
CREATE INDEX IF NOT EXISTS idx_marketing_events_created_at ON marketing_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_surface_type ON marketing_events(surface, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_session ON marketing_events(session_id, created_at DESC);
`);

export default db;
