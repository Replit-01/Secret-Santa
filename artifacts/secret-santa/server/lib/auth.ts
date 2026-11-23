import { createHash, randomBytes } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { db } from "./database.js";

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

export function createSession(userId: number, res: Response): void {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(hashSessionToken(token), userId, expiresAt, new Date().toISOString());
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function removeSession(req: Request, res: Response): void {
  const token = readSessionToken(req);
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
  }
  clearSessionCookie(res);
}

function findSessionUser(token: string): AuthenticatedUser | undefined {
  const tokenHash = hashSessionToken(token);
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.is_admin AS isAdmin, s.expires_at AS expiresAt
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(tokenHash) as
    | { id: number; username: string; isAdmin: number; expiresAt: number }
    | undefined;

  if (!row) return undefined;
  if (row.expiresAt <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    return undefined;
  }

  return { id: row.id, username: row.username, isAdmin: row.isAdmin === 1 };
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = readSessionToken(req);
  const user = token ? findSessionUser(token) : undefined;
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
