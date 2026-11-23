import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { hashPassword } from "./passwords.js";

const configuredPath = process.env.SQLITE_PATH;
const databasePath =
  configuredPath === ":memory:"
    ? ":memory:"
    : configuredPath
      ? path.resolve(process.cwd(), configuredPath)
      : path.resolve(process.cwd(), "data", "secret-santa.sqlite");

if (databasePath !== ":memory:") {
  mkdirSync(path.dirname(databasePath), { recursive: true });
}

export const db = new Database(databasePath);
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1)),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'drawn')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (room_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id, user_id)
      REFERENCES room_members(room_id, user_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    giver_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (room_id, giver_id),
    UNIQUE (room_id, recipient_id),
    CHECK (giver_id <> recipient_id),
    FOREIGN KEY (room_id, giver_id)
      REFERENCES room_members(room_id, user_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id, recipient_id)
      REFERENCES room_members(room_id, user_id) ON DELETE CASCADE
  );
`);

db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

const adminExists = db
  .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
  .get("admin");

if (!adminExists) {
  db.prepare(
    "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 1, ?)",
  ).run("admin", hashPassword("admin"), new Date().toISOString());
}
