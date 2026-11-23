import { Router } from "express";
import { GetProfileResponse } from "@workspace/api-zod";
import { authenticatedUser, requireAuth } from "../lib/auth.js";
import { db } from "../lib/database.js";
import { getProfileRooms } from "../lib/room-data.js";

const router = Router();

router.get("/profile", requireAuth, (req, res) => {
  const user = authenticatedUser(req);
  const account = db
    .prepare("SELECT id, username, is_admin AS isAdmin FROM users WHERE id = ?")
    .get(user.id) as { id: number; username: string; isAdmin: number } | undefined;
  if (!account) {
    res.status(401).json({ error: "Konto nie jest już dostępne." });
    return;
  }

  res.json(
    GetProfileResponse.parse({
      user: { id: account.id, username: account.username, isAdmin: account.isAdmin === 1 },
      rooms: getProfileRooms(user.id),
    }),
  );
});

export default router;
