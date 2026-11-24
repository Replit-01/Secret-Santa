import { Router } from "express";
import {
  CreateRoomBody,
  CreateRoomResponse,
  DeleteRoomMemberParams,
  DeleteRoomMemberResponse,
  DeleteRoomParams,
  DeleteRoomResponse,
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
  deleteRoom,
  deleteRoomMember,
  drawRoom,
  listAdminRooms,
  resetRoomDraw,
} from "../lib/room-data.js";

const router = Router();
router.use("/admin", requireAuth, requireAdmin);

router.get("/admin/rooms", async (_req, res) => {
  res.json(ListAdminRoomsResponse.parse({ rooms: await listAdminRooms() }));
});

router.post("/admin/rooms", async (req, res) => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Podaj nazwę pokoju (maksymalnie 80 znaków)." });
    return;
  }
  const room = await createRoom(parsed.data.name, authenticatedUser(req).id);
  res.status(201).json(CreateRoomResponse.parse(room));
});

router.delete("/admin/rooms/:roomCode", async (req, res) => {
  const parsed = DeleteRoomParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase(),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }

  const result = await deleteRoom(parsed.data.roomCode);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  res.json(DeleteRoomResponse.parse({ ok: true }));
});

router.delete("/admin/rooms/:roomCode/members/:userId", async (req, res) => {
  const parsed = DeleteRoomMemberParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase(),
    userId: req.params.userId,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy pokój lub uczestnik." });
    return;
  }

  const result = await deleteRoomMember(parsed.data.roomCode, parsed.data.userId);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "not-member") {
    res.status(404).json({ error: "Użytkownik nie należy do tej wymiany." });
    return;
  }
  if (result.kind === "already-drawn") {
    res.status(409).json({ error: "Nie można usunąć uczestnika po losowaniu." });
    return;
  }
  res.json(DeleteRoomMemberResponse.parse({ ok: true }));
});

router.post("/rooms/:roomCode/draw", requireAuth, requireAdmin, async (req, res) => {
  const parsed = DrawRoomParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase(),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const result = await drawRoom(parsed.data.roomCode);
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

router.post("/rooms/:roomCode/reset", requireAuth, requireAdmin, async (req, res) => {
  const parsed = ResetRoomDrawParams.safeParse({
    roomCode: String(req.params.roomCode ?? "").toUpperCase(),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const result = await resetRoomDraw(parsed.data.roomCode);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  res.json(ResetRoomDrawResponse.parse(result.room));
});

export default router;
