#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetScript = path.join(__dirname, "thesis-audit.js");

const child = spawn(process.execPath, [targetScript, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    AUDIT_PROFILE: "book"
  }
});

child.on("error", (error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});