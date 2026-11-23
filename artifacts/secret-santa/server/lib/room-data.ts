import { randomInt } from "node:crypto";
import { db } from "./database.js";

export type RoomStatus = "open" | "drawn";

export interface RoomSummary {
  code: string;
  name: string;
  status: RoomStatus;
  memberCount: number;
  wishlistCount: number;
  createdAt: string;
}

interface RoomRecord extends RoomSummary {
  id: number;
}

export interface RoomMember {
  id: number;
  username: string;
  joinedAt: string;
  hasWishlist: boolean;
}

export interface RoomDetail {
  room: RoomSummary;
  members: RoomMember[];
  isMember: boolean;
  myWishlist: string;
}

export interface Wishlist {
  roomCode: string;
  text: string;
  updatedAt: string;
}

export interface Assignment {
  roomCode: string;
  recipient: { id: number; username: string };
  wishlist: Wishlist;
}

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

function findRoom(code: string): RoomRecord | undefined {
  return db.prepare(`${roomRecordQuery()} WHERE r.code = ? COLLATE NOCASE`).get(code) as
    | RoomRecord
    | undefined;
}

function publicRoom(record: RoomRecord): RoomSummary {
  const { id: _id, ...summary } = record;
  return {
    ...summary,
    status: summary.status,
    memberCount: Number(summary.memberCount),
    wishlistCount: Number(summary.wishlistCount),
  };
}

function memberExists(roomId: number, userId: number): boolean {
  return Boolean(
    db
      .prepare("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?")
      .get(roomId, userId),
  );
}

export function listAdminRooms(): RoomSummary[] {
  const rows = db
    .prepare(`${roomRecordQuery()} ORDER BY r.created_at DESC, r.id DESC`)
    .all() as RoomRecord[];
  return rows.map(publicRoom);
}

export type DeleteRoomResult = { kind: "ok" } | { kind: "not-found" };

export function deleteRoom(code: string): DeleteRoomResult {
  const result = db
    .prepare("DELETE FROM rooms WHERE code = ? COLLATE NOCASE")
    .run(code);
  return result.changes > 0 ? { kind: "ok" } : { kind: "not-found" };
}

export type DeleteRoomMemberResult =
  | { kind: "ok" }
  | { kind: "not-found" }
  | { kind: "not-member" }
  | { kind: "already-drawn" };

export function deleteRoomMember(
  code: string,
  userId: number,
): DeleteRoomMemberResult {
  const remove = db.transaction((): DeleteRoomMemberResult => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn") return { kind: "already-drawn" };
    if (!memberExists(record.id, userId)) return { kind: "not-member" };

    db.prepare("DELETE FROM room_members WHERE room_id = ? AND user_id = ?").run(
      record.id,
      userId,
    );
    return { kind: "ok" };
  });
  return remove.immediate();
}

export function createRoom(name: string, creatorId: number): RoomSummary {
  const createdAt = new Date().toISOString();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    try {
      db.prepare(
        "INSERT INTO rooms (code, name, status, created_by, created_at) VALUES (?, ?, 'open', ?, ?)",
      ).run(code, name.trim(), creatorId, createdAt);
      const room = findRoom(code);
      if (!room) throw new Error("Room creation did not persist");
      return publicRoom(room);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed: rooms.code")
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not generate a unique room code");
}

export function getRoomDetail(code: string, userId: number): RoomDetail | undefined {
  const record = findRoom(code);
  if (!record) return undefined;

  const members = db
    .prepare(
      `SELECT u.id, u.username, m.joined_at AS joinedAt,
        CASE WHEN length(trim(COALESCE(w.text, ''))) > 0 THEN 1 ELSE 0 END AS hasWishlist
       FROM room_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN wishlists w ON w.room_id = m.room_id AND w.user_id = m.user_id
       WHERE m.room_id = ?
       ORDER BY m.joined_at ASC, u.username COLLATE NOCASE ASC`,
    )
    .all(record.id) as Array<Omit<RoomMember, "hasWishlist"> & { hasWishlist: number }>;
  const isMember = memberExists(record.id, userId);
  const wishlist = isMember
    ? (db
        .prepare("SELECT text FROM wishlists WHERE room_id = ? AND user_id = ?")
        .get(record.id, userId) as { text: string } | undefined)
    : undefined;

  return {
    room: publicRoom(record),
    members: members.map((member) => ({
      ...member,
      hasWishlist: member.hasWishlist === 1,
    })),
    isMember,
    myWishlist: wishlist?.text ?? "",
  };
}

export function getProfileRooms(userId: number): Array<{
  code: string;
  name: string;
  status: RoomStatus;
  memberCount: number;
  myWishlist: string;
}> {
  return db
    .prepare(
      `SELECT r.code, r.name, r.status,
        (SELECT COUNT(*) FROM room_members all_members WHERE all_members.room_id = r.id) AS memberCount,
        COALESCE(w.text, '') AS myWishlist
       FROM room_members m
       JOIN rooms r ON r.id = m.room_id
       LEFT JOIN wishlists w ON w.room_id = m.room_id AND w.user_id = m.user_id
       WHERE m.user_id = ?
       ORDER BY r.created_at DESC, r.id DESC`,
    )
    .all(userId)
    .map((row) => {
      const room = row as {
        code: string;
        name: string;
        status: RoomStatus;
        memberCount: number;
        myWishlist: string;
      };
      return { ...room, memberCount: Number(room.memberCount) };
    });
}

export type JoinRoomResult =
  | { kind: "ok"; detail: RoomDetail }
  | { kind: "not-found" }
  | { kind: "closed" };

export function joinRoom(code: string, userId: number): JoinRoomResult {
  const join = db.transaction((): JoinRoomResult => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn" && !memberExists(record.id, userId)) {
      return { kind: "closed" };
    }

    const now = new Date().toISOString();
    db.prepare(
      "INSERT OR IGNORE INTO room_members (room_id, user_id, joined_at) VALUES (?, ?, ?)",
    ).run(record.id, userId, now);
    db.prepare(
      "INSERT OR IGNORE INTO wishlists (room_id, user_id, text, updated_at) VALUES (?, ?, '', ?)",
    ).run(record.id, userId, now);
    const detail = getRoomDetail(code, userId);
    return detail ? { kind: "ok", detail } : { kind: "not-found" };
  });
  return join.immediate();
}

export type UpdateWishlistResult =
  | { kind: "ok"; wishlist: Wishlist }
  | { kind: "not-found" }
  | { kind: "not-member" };

export function updateWishlist(
  code: string,
  userId: number,
  text: string,
): UpdateWishlistResult {
  const record = findRoom(code);
  if (!record) return { kind: "not-found" };
  if (!memberExists(record.id, userId)) return { kind: "not-member" };

  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO wishlists (room_id, user_id, text, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(room_id, user_id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
  ).run(record.id, userId, text, updatedAt);
  return { kind: "ok", wishlist: { roomCode: record.code, text, updatedAt } };
}

export type AssignmentResult =
  | { kind: "ok"; assignment: Assignment }
  | { kind: "not-found" }
  | { kind: "not-member" }
  | { kind: "not-drawn" }
  | { kind: "missing" };

export function getAssignment(code: string, userId: number): AssignmentResult {
  const record = findRoom(code);
  if (!record) return { kind: "not-found" };
  if (!memberExists(record.id, userId)) return { kind: "not-member" };
  if (record.status !== "drawn") return { kind: "not-drawn" };

  const row = db
    .prepare(
      `SELECT recipient.id AS recipientId, recipient.username AS recipientUsername,
        COALESCE(w.text, '') AS wishlistText, COALESCE(w.updated_at, ?) AS wishlistUpdatedAt
       FROM assignments a
       JOIN users recipient ON recipient.id = a.recipient_id
       LEFT JOIN wishlists w ON w.room_id = a.room_id AND w.user_id = a.recipient_id
       WHERE a.room_id = ? AND a.giver_id = ?`,
    )
    .get(record.createdAt, record.id, userId) as
    | {
        recipientId: number;
        recipientUsername: string;
        wishlistText: string;
        wishlistUpdatedAt: string;
      }
    | undefined;
  if (!row) return { kind: "missing" };

  return {
    kind: "ok",
    assignment: {
      roomCode: record.code,
      recipient: { id: row.recipientId, username: row.recipientUsername },
      wishlist: {
        roomCode: record.code,
        text: row.wishlistText,
        updatedAt: row.wishlistUpdatedAt,
      },
    },
  };
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export type RoomActionResult =
  | { kind: "ok"; room: RoomSummary }
  | { kind: "not-found" }
  | { kind: "too-few-members" }
  | { kind: "already-drawn" };

export function drawRoom(code: string): RoomActionResult {
  const draw = db.transaction((): RoomActionResult => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn") return { kind: "already-drawn" };

    const members = db
      .prepare("SELECT user_id AS userId FROM room_members WHERE room_id = ?")
      .all(record.id) as Array<{ userId: number }>;
    if (members.length < 2) return { kind: "too-few-members" };

    const givers = members.map((member) => member.userId);
    let recipients: number[];
    do {
      recipients = shuffled(givers);
    } while (recipients.some((recipientId, index) => recipientId === givers[index]));

    const createdAt = new Date().toISOString();
    const insertAssignment = db.prepare(
      "INSERT INTO assignments (room_id, giver_id, recipient_id, created_at) VALUES (?, ?, ?, ?)",
    );
    givers.forEach((giverId, index) => {
      insertAssignment.run(record.id, giverId, recipients[index], createdAt);
    });
    db.prepare("UPDATE rooms SET status = 'drawn' WHERE id = ?").run(record.id);

    const updatedRoom = findRoom(code);
    return updatedRoom
      ? { kind: "ok", room: publicRoom(updatedRoom) }
      : { kind: "not-found" };
  });
  return draw.immediate();
}

export type ResetRoomResult =
  | { kind: "ok"; room: RoomSummary }
  | { kind: "not-found" };

export function resetRoomDraw(code: string): ResetRoomResult {
  const reset = db.transaction((): ResetRoomResult => {
    const record = findRoom(code);
    if (!record) return { kind: "not-found" };
    db.prepare("DELETE FROM assignments WHERE room_id = ?").run(record.id);
    db.prepare("UPDATE rooms SET status = 'open' WHERE id = ?").run(record.id);
    const updatedRoom = findRoom(code);
    return updatedRoom
      ? { kind: "ok", room: publicRoom(updatedRoom) }
      : { kind: "not-found" };
  });
  return reset.immediate();
}
