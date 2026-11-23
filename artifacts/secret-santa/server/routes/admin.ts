import { Router } from "express";
import {
  CreateRoomBody,
  CreateRoomResponse,
  DrawRoomParams,
  DrawRoomResponse,
  ListAdminRoomsResponse,
  ResetRoomDrawParams,
  ResetRoomDrawResponse,
} from "@workspace/api-zod";
import {
  authenticatedUser,
  requireAdmin,
  requireAuth,
} from "../lib/auth.js";
import {
  createRoom,
  drawRoom,
  listAdminRooms,
  resetRoomDraw,
} from "../lib/room-data.js";

const router = Router();
router.use("/admin", requireAuth, requireAdmin);

router.get("/admin/rooms", (_req, res) => {
  res.json(ListAdminRoomsResponse.parse({ rooms: listAdminRooms() }));
});

router.post("/admin/rooms", (req, res) => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Podaj nazwę pokoju (maksymalnie 80 znaków)." });
    return;
  }
  const room = createRoom(parsed.data.name, authenticatedUser(req).id);
  res.status(201).json(CreateRoomResponse.parse(room));
});

router.post("/rooms/:roomCode/draw", requireAuth, requireAdmin, (req, res) => {
  const parsed = DrawRoomParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase(),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const result = drawRoom(parsed.data.roomCode);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "too-few-members") {
    res.status(409).json({ error: "Do losowania potrzebne są co najmniej 2 osoby." });
    return;
  }
  if (result.kind === "already-drawn") {
    res.status(409).json({ error: "Losowanie już się odbyło. Zresetuj je, aby losować ponownie." });
    return;
  }
  res.json(DrawRoomResponse.parse(result.room));
});

router.post("/rooms/:roomCode/reset", requireAuth, requireAdmin, (req, res) => {
  const parsed = ResetRoomDrawParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase(),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const result = resetRoomDraw(parsed.data.roomCode);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  res.json(ResetRoomDrawResponse.parse(result.room));
});

export default router;
