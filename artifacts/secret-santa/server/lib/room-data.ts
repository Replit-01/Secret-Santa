import { randomInt } from "node:crypto";
import { inTransaction, query, type QueryExecutor } from "./database.js";

export type RoomStatus = "open" | "drawn";

export interface RoomSummary {
  code: string;
  name: string;
  status: RoomStatus;
  memberCount: number;
  wishlistCount: number;
  createdAt: string;
}

interface RoomRecord extends Omit<RoomSummary, "memberCount" | "wishlistCount"> {
  id: number;
  memberCount: number | string;
  wishlistCount: number | string;
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
      r.created_at AS "createdAt",
      (SELECT COUNT(*) FROM room_members m WHERE m.room_id = r.id) AS "memberCount",
      (SELECT COUNT(*) FROM wishlists w WHERE w.room_id = r.id AND length(trim(w.text)) > 0) AS "wishlistCount"
    FROM rooms r`;
}

async function findRoom(
  code: string,
  executor: QueryExecutor = { query },
  lock = false,
): Promise<RoomRecord | undefined> {
  const result = await executor.query<RoomRecord>(
    `${roomRecordQuery()} WHERE UPPER(r.code) = UPPER($1)${lock ? " FOR UPDATE OF r" : ""}`,
    [code],
  );
  return result.rows[0];
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

async function memberExists(
  roomId: number,
  userId: number,
  executor: QueryExecutor = { query },
): Promise<boolean> {
  const result = await executor.query(
    "SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2",
    [roomId, userId],
  );
  return result.rowCount !== 0;
}

export async function listAdminRooms(): Promise<RoomSummary[]> {
  const result = await query<RoomRecord>(
    `${roomRecordQuery()} ORDER BY r.created_at DESC, r.id DESC`,
  );
  return result.rows.map(publicRoom);
}

export type DeleteRoomResult = { kind: "ok" } | { kind: "not-found" };

export async function deleteRoom(code: string): Promise<DeleteRoomResult> {
  const result = await query("DELETE FROM rooms WHERE UPPER(code) = UPPER($1)", [code]);
  return result.rowCount ? { kind: "ok" } : { kind: "not-found" };
}

export type DeleteRoomMemberResult =
  | { kind: "ok" }
  | { kind: "not-found" }
  | { kind: "not-member" }
  | { kind: "already-drawn" };

export function deleteRoomMember(
  code: string,
  userId: number,
): Promise<DeleteRoomMemberResult> {
  return inTransaction(async (executor) => {
    const record = await findRoom(code, executor, true);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn") return { kind: "already-drawn" };
    if (!(await memberExists(record.id, userId, executor))) return { kind: "not-member" };

    await executor.query(
      "DELETE FROM room_members WHERE room_id = $1 AND user_id = $2",
      [record.id, userId],
    );
    return { kind: "ok" };
  });
}

export async function createRoom(name: string, creatorId: number): Promise<RoomSummary> {
  const createdAt = new Date().toISOString();
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    try {
      await query(
        "INSERT INTO rooms (code, name, status, created_by, created_at) VALUES ($1, $2, 'open', $3, $4)",
        [code, name.trim(), creatorId, createdAt],
      );
      const room = await findRoom(code);
      if (!room) throw new Error("Room creation did not persist");
      return publicRoom(room);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505" &&
        "constraint" in error &&
        error.constraint === "rooms_code_key"
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not generate a unique room code");
}

export async function getRoomDetail(
  code: string,
  userId: number,
  executor: QueryExecutor = { query },
): Promise<RoomDetail | undefined> {
  const record = await findRoom(code, executor);
  if (!record) return undefined;

  const memberResult = await executor.query<{
    id: number;
    username: string;
    joinedAt: string;
    hasWishlist: boolean;
  }>(
    `SELECT u.id, u.username, m.joined_at AS "joinedAt",
      (length(trim(COALESCE(w.text, ''))) > 0) AS "hasWishlist"
     FROM room_members m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN wishlists w ON w.room_id = m.room_id AND w.user_id = m.user_id
     WHERE m.room_id = $1
     ORDER BY m.joined_at ASC, LOWER(u.username) ASC`,
    [record.id],
  );
  const isMember = await memberExists(record.id, userId, executor);
  const wishlistResult = isMember
    ? await executor.query<{ text: string }>(
        "SELECT text FROM wishlists WHERE room_id = $1 AND user_id = $2",
        [record.id, userId],
      )
    : undefined;

  return {
    room: publicRoom(record),
    members: memberResult.rows,
    isMember,
    myWishlist: wishlistResult?.rows[0]?.text ?? "",
  };
}

export async function getProfileRooms(userId: number): Promise<Array<{
  code: string;
  name: string;
  status: RoomStatus;
  memberCount: number;
  myWishlist: string;
}>> {
  const result = await query<{
    code: string;
    name: string;
    status: RoomStatus;
    memberCount: string;
    myWishlist: string;
  }>(
    `SELECT r.code, r.name, r.status,
      (SELECT COUNT(*) FROM room_members all_members WHERE all_members.room_id = r.id) AS "memberCount",
      COALESCE(w.text, '') AS "myWishlist"
     FROM room_members m
     JOIN rooms r ON r.id = m.room_id
     LEFT JOIN wishlists w ON w.room_id = m.room_id AND w.user_id = m.user_id
     WHERE m.user_id = $1
     ORDER BY r.created_at DESC, r.id DESC`,
    [userId],
  );
  return result.rows.map((room) => ({
    ...room,
    memberCount: Number(room.memberCount),
  }));
}

export type JoinRoomResult =
  | { kind: "ok"; detail: RoomDetail }
  | { kind: "not-found" }
  | { kind: "closed" };

export function joinRoom(code: string, userId: number): Promise<JoinRoomResult> {
  return inTransaction(async (executor) => {
    const record = await findRoom(code, executor, true);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn" && !(await memberExists(record.id, userId, executor))) {
      return { kind: "closed" };
    }

    const now = new Date().toISOString();
    await executor.query(
      "INSERT INTO room_members (room_id, user_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [record.id, userId, now],
    );
    await executor.query(
      "INSERT INTO wishlists (room_id, user_id, text, updated_at) VALUES ($1, $2, '', $3) ON CONFLICT DO NOTHING",
      [record.id, userId, now],
    );
    const detail = await getRoomDetail(code, userId, executor);
    return detail ? { kind: "ok", detail } : { kind: "not-found" };
  });
}

export type UpdateWishlistResult =
  | { kind: "ok"; wishlist: Wishlist }
  | { kind: "not-found" }
  | { kind: "not-member" };

export async function updateWishlist(
  code: string,
  userId: number,
  text: string,
): Promise<UpdateWishlistResult> {
  const record = await findRoom(code);
  if (!record) return { kind: "not-found" };
  if (!(await memberExists(record.id, userId))) return { kind: "not-member" };

  const updatedAt = new Date().toISOString();
  await query(
    `INSERT INTO wishlists (room_id, user_id, text, updated_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT(room_id, user_id) DO UPDATE SET text = EXCLUDED.text, updated_at = EXCLUDED.updated_at`,
    [record.id, userId, text, updatedAt],
  );
  return { kind: "ok", wishlist: { roomCode: record.code, text, updatedAt } };
}

export type AssignmentResult =
  | { kind: "ok"; assignment: Assignment }
  | { kind: "not-found" }
  | { kind: "not-member" }
  | { kind: "not-drawn" }
  | { kind: "missing" };

export async function getAssignment(
  code: string,
  userId: number,
): Promise<AssignmentResult> {
  const record = await findRoom(code);
  if (!record) return { kind: "not-found" };
  if (!(await memberExists(record.id, userId))) return { kind: "not-member" };
  if (record.status !== "drawn") return { kind: "not-drawn" };

  const result = await query<{
    recipientId: number;
    recipientUsername: string;
    wishlistText: string;
    wishlistUpdatedAt: string;
  }>(
    `SELECT recipient.id AS "recipientId", recipient.username AS "recipientUsername",
      COALESCE(w.text, '') AS "wishlistText", COALESCE(w.updated_at, $1) AS "wishlistUpdatedAt"
     FROM assignments a
     JOIN users recipient ON recipient.id = a.recipient_id
     LEFT JOIN wishlists w ON w.room_id = a.room_id AND w.user_id = a.recipient_id
     WHERE a.room_id = $2 AND a.giver_id = $3`,
    [record.createdAt, record.id, userId],
  );
  const row = result.rows[0];
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

export function drawRoom(code: string): Promise<RoomActionResult> {
  return inTransaction(async (executor) => {
    const record = await findRoom(code, executor, true);
    if (!record) return { kind: "not-found" };
    if (record.status === "drawn") return { kind: "already-drawn" };

    const memberResult = await executor.query<{ userId: number }>(
      'SELECT user_id AS "userId" FROM room_members WHERE room_id = $1',
      [record.id],
    );
    if (memberResult.rows.length < 2) return { kind: "too-few-members" };

    const givers = memberResult.rows.map((member) => member.userId);
    let recipients: number[];
    do {
      recipients = shuffled(givers);
    } while (recipients.some((recipientId, index) => recipientId === givers[index]));

    const createdAt = new Date().toISOString();
    for (const [index, giverId] of givers.entries()) {
      await executor.query(
        "INSERT INTO assignments (room_id, giver_id, recipient_id, created_at) VALUES ($1, $2, $3, $4)",
        [record.id, giverId, recipients[index], createdAt],
      );
    }
    await executor.query("UPDATE rooms SET status = 'drawn' WHERE id = $1", [record.id]);

    const updatedRoom = await findRoom(code, executor);
    return updatedRoom
      ? { kind: "ok", room: publicRoom(updatedRoom) }
      : { kind: "not-found" };
  });
}

export type ResetRoomResult =
  | { kind: "ok"; room: RoomSummary }
  | { kind: "not-found" };

export function resetRoomDraw(code: string): Promise<ResetRoomResult> {
  return inTransaction(async (executor) => {
    const record = await findRoom(code, executor, true);
    if (!record) return { kind: "not-found" };
    await executor.query("DELETE FROM assignments WHERE room_id = $1", [record.id]);
    await executor.query("UPDATE rooms SET status = 'open' WHERE id = $1", [record.id]);
    const updatedRoom = await findRoom(code, executor);
    return updatedRoom
      ? { kind: "ok", room: publicRoom(updatedRoom) }
      : { kind: "not-found" };
  });
}
