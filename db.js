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
`);

// Migration: Add 'shared' column if it doesn't exist
const checkShared = db.prepare("SELECT COUNT(*) as count FROM pragma_table_info('pastes') WHERE name='shared'");
const hasShared = checkShared.get().count > 0;

if (!hasShared) {
  db.exec("ALTER TABLE pastes ADD COLUMN shared INTEGER NOT NULL DEFAULT 0");
  console.log("✅ Migration: Added 'shared' column to pastes table");
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

// Create indexes (now safe because 'shared' column exists)
db.exec(`
CREATE INDEX IF NOT EXISTS idx_pastes_session_id ON pastes(session_id);
CREATE INDEX IF NOT EXISTS idx_pastes_session_updated ON pastes(session_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pastes_session_created ON pastes(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pastes_shared ON pastes(shared, id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_images_paste_id ON images(paste_id);
`);

export default db;
