import { Router } from "express";
import { GetProfileResponse } from "@workspace/api-zod";
import { authenticatedUser, requireAuth } from "../lib/auth.js";
import { query } from "../lib/database.js";
import { getProfileRooms } from "../lib/room-data.js";

const router = Router();

router.get("/profile", requireAuth, async (req, res) => {
  const user = authenticatedUser(req);
  const result = await query<{ id: number; username: string; isAdmin: boolean }>(
    'SELECT id, username, is_admin AS "isAdmin" FROM users WHERE id = $1',
    [user.id],
  );
  const account = result.rows[0];
  if (!account) {
    res.status(401).json({ error: "Konto nie jest już dostępne." });
    return;
  }

  res.json(
    GetProfileResponse.parse({
      user: { id: account.id, username: account.username, isAdmin: account.isAdmin },
      rooms: await getProfileRooms(user.id),
    }),
  );
});

export default router;
