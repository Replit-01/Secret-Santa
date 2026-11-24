import { createHash, randomBytes } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { query } from "./database.js";

export interface AuthenticatedUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthenticatedUser;
    }
  }
}

const COOKIE_NAME = "secret_santa_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_MS,
  };
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readSessionToken(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

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
  return undefined;
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function createSession(userId: number, res: Response): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await query(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)",
    [hashSessionToken(token), userId, expiresAt, new Date().toISOString()],
  );
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export async function removeSession(req: Request, res: Response): Promise<void> {
  const token = readSessionToken(req);
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashSessionToken(token)]);
  }
  clearSessionCookie(res);
}

async function findSessionUser(token: string): Promise<AuthenticatedUser | undefined> {
  const tokenHash = hashSessionToken(token);
  const result = await query<{
    id: number;
    username: string;
    isAdmin: boolean;
    expiresAt: string;
  }>(
      `SELECT u.id, u.username, u.is_admin AS "isAdmin", s.expires_at AS "expiresAt"
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [tokenHash],
    );
  const row = result.rows[0];

  if (!row) return undefined;
  if (Number(row.expiresAt) <= Date.now()) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return undefined;
  }

  return { id: row.id, username: row.username, isAdmin: row.isAdmin };
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = readSessionToken(req);
  const user = token ? await findSessionUser(token) : undefined;
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Zaloguj się, aby kontynuować." });
    return;
  }
  req.currentUser = user;
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.currentUser?.isAdmin) {
    res.status(403).json({ error: "Ta czynność jest dostępna tylko dla administratora." });
    return;
  }
  next();
};

export function authenticatedUser(req: Request): AuthenticatedUser {
  if (!req.currentUser) {
    throw new Error("Missing authenticated user after auth middleware");
  }
  return req.currentUser;
}

export function publicUser(user: AuthenticatedUser): AuthenticatedUser {
  return user;
}
