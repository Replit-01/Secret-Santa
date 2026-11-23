// server/app.ts
import express from "express";
import pinoHttp from "pino-http";
import { GetHealthResponse } from "@workspace/api-zod";

// server/lib/logger.ts
import pino from "pino";
var isProduction = process.env.NODE_ENV === "production";
var logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']"
  ],
  ...isProduction ? {} : {
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// server/routes/admin.ts
import { Router } from "express";
import {
  CreateRoomBody,
  CreateRoomResponse,
  DrawRoomParams,
  DrawRoomResponse,
  ListAdminRoomsResponse,
  ResetRoomDrawParams,
  ResetRoomDrawResponse
} from "@workspace/api-zod";

// server/lib/auth.ts
import { createHash, randomBytes as randomBytes2 } from "node:crypto";

// server/lib/database.ts
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

// server/lib/passwords.ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
var KEY_LENGTH = 64;
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${key}`;
}
function verifyPassword(password, encoded) {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// server/lib/database.ts
var configuredPath = process.env.SQLITE_PATH;
var databasePath = configuredPath === ":memory:" ? ":memory:" : configuredPath ? path.resolve(process.cwd(), configuredPath) : path.resolve(process.cwd(), "data", "secret-santa.sqlite");
if (databasePath !== ":memory:") {
  mkdirSync(path.dirname(databasePath), { recursive: true });
}
var db = new Database(databasePath);
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
var adminExists = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get("admin");
if (!adminExists) {
  db.prepare(
    "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 1, ?)"
  ).run("admin", hashPassword("admin"), (/* @__PURE__ */ new Date()).toISOString());
}

// server/lib/auth.ts
var COOKIE_NAME = "secret_santa_session";
var SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1e3;
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS
  };
}
function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function readSessionToken(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return void 0;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== COOKIE_NAME) continue;
    const value = rawValue.join("=");
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return void 0;
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}
function createSession(userId, res) {
  const token = randomBytes2(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(hashSessionToken(token), userId, expiresAt, (/* @__PURE__ */ new Date()).toISOString());
  res.cookie(COOKIE_NAME, token, cookieOptions());
}
function removeSession(req, res) {
  const token = readSessionToken(req);
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
  }
  clearSessionCookie(res);
}
function findSessionUser(token) {
  const tokenHash = hashSessionToken(token);
  const row = db.prepare(
    `SELECT u.id, u.username, u.is_admin AS isAdmin, s.expires_at AS expiresAt
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
  ).get(tokenHash);
  if (!row) return void 0;
  if (row.expiresAt <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return void 0;
  }
  return { id: row.id, username: row.username, isAdmin: row.isAdmin === 1 };
}
var requireAuth = (req, res, next) => {
  const token = readSessionToken(req);
  const user = token ? findSessionUser(token) : void 0;
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Zaloguj si\u0119, aby kontynuowa\u0107." });
    return;
  }
  req.currentUser = user;
  next();
};
var requireAdmin = (req, res, next) => {
  if (!req.currentUser?.isAdmin) {
    res.status(403).json({ error: "Ta czynno\u015B\u0107 jest dost\u0119pna tylko dla administratora." });
    return;
  }
  next();
};
function authenticatedUser(req) {
  if (!req.currentUser) {
    throw new Error("Missing authenticated user after auth middleware");
  }
  return req.currentUser;
}

// server/lib/room-data.ts
import { randomInt } from "node:crypto";
var ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function roomRecordQuery() {
  return `SELECT
      r.id,
      r.code,
      r.name,
      r.status,
      r.created_at AS createdAt,
      (SELECT COUNT(*) FROM room_members m WHERE m.room_id = r.id) AS memberCount,
      (SELECT COUNT(*) FROM wishlists w WHERE w.room_id = r.id AND length(trim(w.text)) > 0) AS wishlistCount
    FROM rooms r`;
}
function findRoom(code) {
  return db.prepare(`${roomRecordQuery()} WHERE r.code = ? COLLATE NOCASE`).get(code);
}
function publicRoom(record) {
  const { id: _id, ...summary } = record;
  return {
    ...summary,
    status: summary.status,
    memberCount: Number(summary.memberCount),
    wishlistCount: Number(summary.wishlistCount)
  };
}
function memberExists(roomId, userId) {
  return Boolean(
    db.prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?").get(roomId, userId)
  );
}
function listAdminRooms() {
  const rows = db.prepare(`${roomRecordQuery()} ORDER BY r.created_at DESC, r.id DESC`).all();
  return rows.map(publicRoom);
}
function createRoom(name, creatorId) {
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    try {
      db.prepare(
        "INSERT INTO rooms (code, name, status, created_by, created_at) VALUES (?, ?, 'open', ?, ?)"
      ).run(code, name.trim(), creatorId, createdAt);
      const room = findRoom(code);
      if (!room) throw new Error("Room creation did not persist");
      return publicRoom(room);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed: rooms.code")) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not generate a unique room code");
}
function getRoomDetail(code, userId) {
  const record = findRoom(code);
  if (!record) return void 0;
  const members = db.prepare(
    `SELECT u.id, u.username, m.joined_at AS joinedAt,
        CASE WHEN length(trim(COALESCE(w.text, ''))) > 0 THEN 1 ELSE 0 END AS hasWishlist
       FROM room_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN wishlists w ON w.room_id = m.room_id AND w.user_id = m.user_id
       WHERE m.room_id = ?
       ORDER BY m.joined_at ASC, u.username COLLATE NOCASE ASC`
  ).all(record.id);
  const isMember = memberExists(record.id, userId);
  const wishlist = isMember ? db.prepare("SELECT text FROM wishlists WHERE room_id = ? AND user_id = ?").get(record.id, userId) : void 0;
  return {
    room: publicRoom(record),
    members: members.map((member) => ({
      ...member,
      hasWishlist: member.hasWishlist === 1
    })),
    isMember,
    myWishlist: wishlist?.text ?? ""
  };
}
function getProfileRooms(userId) {
  return db.prepare(
    `SELECT r.code, r.name, r.status,
        (SELECT COUNT(*) FROM room_members all_members WHERE all_members.room_id = r.id) AS memberCount,
        COALESCE(w.text, '') AS myWishlist
       FROM room_members m
       JOIN rooms r ON r.id = m.room_id
       LEFT JOIN wishlists w ON w.room_id = m.room_id AND w.user_id = m.user_id
       WHERE m.user_id = ?
       ORDER BY r.created_at DESC, r.id DESC`
  ).all(userId).map((row) => {
    const room = row;
    return { ...room, memberCount: Number(room.memberCount) };
  });
}
function joinRoom(code, userId) {
  const join = db.transaction(() => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn" && !memberExists(record.id, userId)) {
      return { kind: "closed" };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db.prepare(
      "INSERT OR IGNORE INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)"
    ).run(record.id, userId, now);
    db.prepare(
      "INSERT OR IGNORE INTO wishlists (room_id, user_id, text, updated_at) VALUES (?, ?, '', ?)"
    ).run(record.id, userId, now);
    const detail = getRoomDetail(code, userId);
    return detail ? { kind: "ok", detail } : { kind: "not-found" };
  });
  return join.immediate();
}
function updateWishlist(code, userId, text) {
  const record = findRoom(code);
  if (!record) return { kind: "not-found" };
  if (!memberExists(record.id, userId)) return { kind: "not-member" };
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.prepare(
    `INSERT INTO wishlists (room_id, user_id, text, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(room_id, user_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`
  ).run(record.id, userId, text, updatedAt);
  return { kind: "ok", wishlist: { roomCode: record.code, text, updatedAt } };
}
function getAssignment(code, userId) {
  const record = findRoom(code);
  if (!record) return { kind: "not-found" };
  if (!memberExists(record.id, userId)) return { kind: "not-member" };
  if (record.status !== "drawn") return { kind: "not-drawn" };
  const row = db.prepare(
    `SELECT recipient.id AS recipientId, recipient.username AS recipientUsername,
        COALESCE(w.text, '') AS wishlistText, COALESCE(w.updated_at, ?) AS wishlistUpdatedAt
       FROM assignments a
       JOIN users recipient ON recipient.id = a.recipient_id
       LEFT JOIN wishlists w ON w.room_id = a.room_id AND w.user_id = a.recipient_id
       WHERE a.room_id = ? AND a.giver_id = ?`
  ).get(record.createdAt, record.id, userId);
  if (!row) return { kind: "missing" };
  return {
    kind: "ok",
    assignment: {
      roomCode: record.code,
      recipient: { id: row.recipientId, username: row.recipientUsername },
      wishlist: {
        roomCode: record.code,
        text: row.wishlistText,
        updatedAt: row.wishlistUpdatedAt
      }
    }
  };
}
function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
function drawRoom(code) {
  const draw = db.transaction(() => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn") return { kind: "already-drawn" };
    const members = db.prepare("SELECT user_id AS userId FROM room_members WHERE room_id = ?").all(record.id);
    if (members.length < 2) return { kind: "too-few-members" };
    const givers = members.map((member) => member.userId);
    let recipients;
    do {
      recipients = shuffled(givers);
    } while (recipients.some((recipientId, index) => recipientId === givers[index]));
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const insertAssignment = db.prepare(
      "INSERT INTO assignments (room_id, giver_id, recipient_id, created_at) VALUES (?, ?, ?, ?)"
    );
    givers.forEach((giverId, index) => {
      insertAssignment.run(record.id, giverId, recipients[index], createdAt);
    });
    db.prepare("UPDATE rooms SET status = 'drawn' WHERE id = ?").run(record.id);
    const updatedRoom = findRoom(code);
    return updatedRoom ? { kind: "ok", room: publicRoom(updatedRoom) } : { kind: "not-found" };
  });
  return draw.immediate();
}
function resetRoomDraw(code) {
  const reset = db.transaction(() => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    db.prepare("DELETE FROM assignments WHERE room_id = ?").run(record.id);
    db.prepare("UPDATE rooms SET status = 'open' WHERE id = ?").run(record.id);
    const updatedRoom = findRoom(code);
    return updatedRoom ? { kind: "ok", room: publicRoom(updatedRoom) } : { kind: "not-found" };
  });
  return reset.immediate();
}

// server/routes/admin.ts
var router = Router();
router.use("/admin", requireAuth, requireAdmin);
router.get("/admin/rooms", (_req, res) => {
  res.json(ListAdminRoomsResponse.parse({ rooms: listAdminRooms() }));
});
router.post("/admin/rooms", (req, res) => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Podaj nazw\u0119 pokoju (maksymalnie 80 znak\xF3w)." });
    return;
  }
  const room = createRoom(parsed.data.name, authenticatedUser(req).id);
  res.status(201).json(CreateRoomResponse.parse(room));
});
router.post("/rooms/:roomCode/draw", requireAuth, requireAdmin, (req, res) => {
  const parsed = DrawRoomParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase()
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawid\u0142owy kod pokoju." });
    return;
  }
  const result = drawRoom(parsed.data.roomCode);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "too-few-members") {
    res.status(409).json({ error: "Do losowania potrzebne s\u0105 co najmniej 2 osoby." });
    return;
  }
  if (result.kind === "already-drawn") {
    res.status(409).json({ error: "Losowanie ju\u017C si\u0119 odby\u0142o. Zresetuj je, aby losowa\u0107 ponownie." });
    return;
  }
  res.json(DrawRoomResponse.parse(result.room));
});
router.post("/rooms/:roomCode/reset", requireAuth, requireAdmin, (req, res) => {
  const parsed = ResetRoomDrawParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase()
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawid\u0142owy kod pokoju." });
    return;
  }
  const result = resetRoomDraw(parsed.data.roomCode);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  res.json(ResetRoomDrawResponse.parse(result.room));
});
var admin_default = router;

// server/routes/auth.ts
import { Router as Router2 } from "express";
import {
  GetCurrentUserResponse,
  LoginUserBody,
  LoginUserResponse,
  LogoutUserResponse,
  RegisterUserBody,
  RegisterUserResponse
} from "@workspace/api-zod";
var router2 = Router2();
function isUsernameConflict(error) {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed: users.username");
}
router2.post("/auth/register", (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nazwa u\u017Cytkownika lub has\u0142o nie spe\u0142nia wymaga\u0144." });
    return;
  }
  const username = parsed.data.username.trim();
  try {
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 0, ?)"
    ).run(username, hashPassword(parsed.data.password), (/* @__PURE__ */ new Date()).toISOString());
    const user = { id: Number(result.lastInsertRowid), username, isAdmin: false };
    createSession(user.id, res);
    res.status(201).json(RegisterUserResponse.parse({ user }));
  } catch (error) {
    if (isUsernameConflict(error)) {
      res.status(409).json({ error: "Ta nazwa u\u017Cytkownika jest ju\u017C zaj\u0119ta." });
      return;
    }
    throw error;
  }
});
router2.post("/auth/login", (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Wpisz nazw\u0119 u\u017Cytkownika i has\u0142o." });
    return;
  }
  const row = db.prepare(
    `SELECT id, username, password_hash AS passwordHash, is_admin AS isAdmin
       FROM users WHERE username = ? COLLATE NOCASE`
  ).get(parsed.data.username.trim());
  if (!row || !verifyPassword(parsed.data.password, row.passwordHash)) {
    res.status(401).json({ error: "Nieprawid\u0142owa nazwa u\u017Cytkownika lub has\u0142o." });
    return;
  }
  const user = { id: row.id, username: row.username, isAdmin: row.isAdmin === 1 };
  createSession(user.id, res);
  res.json(LoginUserResponse.parse({ user }));
});
router2.post("/auth/logout", (req, res) => {
  removeSession(req, res);
  res.json(LogoutUserResponse.parse({ ok: true }));
});
router2.get("/auth/me", requireAuth, (req, res) => {
  res.json(GetCurrentUserResponse.parse({ user: authenticatedUser(req) }));
});
var auth_default = router2;

// server/routes/profile.ts
import { Router as Router3 } from "express";
import { GetProfileResponse } from "@workspace/api-zod";
var router3 = Router3();
router3.get("/profile", requireAuth, (req, res) => {
  const user = authenticatedUser(req);
  const account = db.prepare("SELECT id, username, is_admin AS isAdmin FROM users WHERE id = ?").get(user.id);
  if (!account) {
    res.status(401).json({ error: "Konto nie jest ju\u017C dost\u0119pne." });
    return;
  }
  res.json(
    GetProfileResponse.parse({
      user: { id: account.id, username: account.username, isAdmin: account.isAdmin === 1 },
      rooms: getProfileRooms(user.id)
    })
  );
});
var profile_default = router3;

// server/routes/rooms.ts
import { Router as Router4 } from "express";
import {
  GetMyAssignmentParams,
  GetMyAssignmentResponse,
  GetRoomParams,
  GetRoomResponse,
  JoinRoomParams,
  JoinRoomResponse,
  UpdateWishlistBody,
  UpdateWishlistParams,
  UpdateWishlistResponse
} from "@workspace/api-zod";
var router4 = Router4();
router4.use("/rooms", requireAuth);
function normalizedRoomCode(value) {
  return String(value ?? "").toUpperCase();
}
router4.get("/rooms/:roomCode", (req, res) => {
  const parsed = GetRoomParams.safeParse({ roomCode: normalizedRoomCode(req.params.roomCode) });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawid\u0142owy kod pokoju." });
    return;
  }
  const detail = getRoomDetail(parsed.data.roomCode, authenticatedUser(req).id);
  if (!detail) {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  res.json(GetRoomResponse.parse(detail));
});
router4.post("/rooms/:roomCode/join", (req, res) => {
  const parsed = JoinRoomParams.safeParse({ roomCode: normalizedRoomCode(req.params.roomCode) });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawid\u0142owy kod pokoju." });
    return;
  }
  const result = joinRoom(parsed.data.roomCode, authenticatedUser(req).id);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "closed") {
    res.status(409).json({ error: "Losowanie ju\u017C si\u0119 odby\u0142o i pok\xF3j nie przyjmuje nowych os\xF3b." });
    return;
  }
  res.json(JoinRoomResponse.parse(result.detail));
});
router4.put("/rooms/:roomCode/wishlist", (req, res) => {
  const params = UpdateWishlistParams.safeParse({
    roomCode: normalizedRoomCode(req.params.roomCode)
  });
  const body = UpdateWishlistBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Lista prezent\xF3w jest nieprawid\u0142owa lub przekracza 3000 znak\xF3w." });
    return;
  }
  const result = updateWishlist(
    params.data.roomCode,
    authenticatedUser(req).id,
    body.data.text
  );
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "not-member") {
    res.status(403).json({ error: "Do\u0142\u0105cz do pokoju, aby edytowa\u0107 swoj\u0105 list\u0119." });
    return;
  }
  res.json(UpdateWishlistResponse.parse(result.wishlist));
});
router4.get("/rooms/:roomCode/assignment", (req, res) => {
  const parsed = GetMyAssignmentParams.safeParse({
    roomCode: normalizedRoomCode(req.params.roomCode)
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawid\u0142owy kod pokoju." });
    return;
  }
  const result = getAssignment(parsed.data.roomCode, authenticatedUser(req).id);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "not-member") {
    res.status(403).json({ error: "Najpierw do\u0142\u0105cz do pokoju." });
    return;
  }
  if (result.kind === "not-drawn") {
    res.status(409).json({ error: "Administrator nie rozpocz\u0105\u0142 jeszcze losowania." });
    return;
  }
  if (result.kind === "missing") {
    res.status(409).json({ error: "Nie znaleziono Twojego przydzia\u0142u. Popro\u015B administratora o reset losowania." });
    return;
  }
  res.json(GetMyAssignmentResponse.parse(result.assignment));
});
var rooms_default = router4;

// server/app.ts
var app = express();
app.disable("x-powered-by");
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0]
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      }
    }
  })
);
app.use(express.json({ limit: "12kb" }));
app.get("/api/healthz", (_req, res) => {
  res.json(GetHealthResponse.parse({ status: "ok" }));
});
app.use("/api", auth_default);
app.use("/api", profile_default);
app.use("/api", admin_default);
app.use("/api", rooms_default);
var errorHandler = (error, _req, res, _next) => {
  logger.error({ err: error }, "API request failed");
  const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" && error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({
    error: status < 500 ? "Nieprawid\u0142owe \u017C\u0105danie." : "Wyst\u0105pi\u0142 b\u0142\u0105d serwera."
  });
};
app.use(errorHandler);
var app_default = app;

// server/index.ts
var port = Number(process.env.PORT ?? 3001);
var server = app_default.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Secret Santa API started");
});
function shutdown(signal) {
  logger.info({ signal }, "Shutting down Secret Santa API");
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
//# sourceMappingURL=index.mjs.map
