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
import { query } from "../lib/database.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";

const router = Router();

function isUsernameConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505" &&
    "constraint" in error &&
    error.constraint === "users_username_lower_idx"
  );
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nazwa użytkownika lub hasło nie spełnia wymagań." });
    return;
  }

  const username = parsed.data.username.trim();
  try {
    const result = await query<{ id: number }>(
      "INSERT INTO users (username, password_hash, is_admin, created_at) VALUES ($1, $2, FALSE, $3) RETURNING id",
      [username, hashPassword(parsed.data.password), new Date().toISOString()],
    );
    const user = { id: result.rows[0].id, username, isAdmin: false };
    await createSession(user.id, res);
    res.status(201).json(RegisterUserResponse.parse({ user }));
  } catch (error) {
    if (isUsernameConflict(error)) {
      res.status(409).json({ error: "Ta nazwa użytkownika jest już zajęta." });
      return;
    }
    throw error;
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Wpisz nazwę użytkownika i hasło." });
    return;
  }

  const result = await query<{
    id: number;
    username: string;
    passwordHash: string;
    isAdmin: boolean;
  }>(
    `SELECT id, username, password_hash AS "passwordHash", is_admin AS "isAdmin"
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [parsed.data.username.trim()],
  );
  const row = result.rows[0];

  if (!row || !verifyPassword(parsed.data.password, row.passwordHash)) {
    res.status(401).json({ error: "Nieprawidłowa nazwa użytkownika lub hasło." });
    return;
  }

  const user = { id: row.id, username: row.username, isAdmin: row.isAdmin };
  await createSession(user.id, res);
  res.json(LoginUserResponse.parse({ user }));
});

router.post("/auth/logout", async (req, res) => {
  await removeSession(req, res);
  res.json(LogoutUserResponse.parse({ ok: true }));
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(GetCurrentUserResponse.parse({ user: authenticatedUser(req) }));
});

export default router;
