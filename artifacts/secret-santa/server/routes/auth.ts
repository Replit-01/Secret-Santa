import { Router } from "express";
import {
  GetCurrentUserResponse,
  LoginUserBody,
  LoginUserResponse,
  LogoutUserResponse,
  RegisterUserBody,
  RegisterUserResponse,
} from "@workspace/api-zod";
import { authenticatedUser, createSession, removeSession, requireAuth } from "../lib/auth.js";
import { db } from "../lib/database.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";

const router = Router();

function isUsernameConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed: users.username");
}

router.post("/auth/register", (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nazwa użytkownika lub hasło nie spełnia wymagań." });
    return;
  }

  const username = parsed.data.username.trim();
  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES (?, ?, 0, ?)",
      )
      .run(username, hashPassword(parsed.data.password), new Date().toISOString());
    const user = { id: Number(result.lastInsertRowid), username, isAdmin: false };
    createSession(user.id, res);
    res.status(201).json(RegisterUserResponse.parse({ user }));
  } catch (error) {
    if (isUsernameConflict(error)) {
      res.status(409).json({ error: "Ta nazwa użytkownika jest już zajęta." });
      return;
    }
    throw error;
  }
});

router.post("/auth/login", (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Wpisz nazwę użytkownika i hasło." });
    return;
  }

  const row = db
    .prepare(
      `SELECT id, username, password_hash AS passwordHash, is_admin AS isAdmin
       FROM users WHERE username = ? COLLATE NOCASE`,
    )
    .get(parsed.data.username.trim()) as
    | { id: number; username: string; passwordHash: string; isAdmin: number }
    | undefined;

  if (!row || !verifyPassword(parsed.data.password, row.passwordHash)) {
    res.status(401).json({ error: "Nieprawidłowa nazwa użytkownika lub hasło." });
    return;
  }

  const user = { id: row.id, username: row.username, isAdmin: row.isAdmin === 1 };
  createSession(user.id, res);
  res.json(LoginUserResponse.parse({ user }));
});

router.post("/auth/logout", (req, res) => {
  removeSession(req, res);
  res.json(LogoutUserResponse.parse({ ok: true }));
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(GetCurrentUserResponse.parse({ user: authenticatedUser(req) }));
});

export default router;
