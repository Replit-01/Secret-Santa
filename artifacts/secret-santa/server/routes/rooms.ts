import { Router } from "express";
import {
  GetMyAssignmentParams,
  GetMyAssignmentResponse,
  GetRoomParams,
  GetRoomResponse,
  JoinRoomParams,
  JoinRoomResponse,
  UpdateWishlistBody,
  UpdateWishlistParams,
  UpdateWishlistResponse,
} from "@workspace/api-zod";
import { authenticatedUser, requireAuth } from "../lib/auth.js";
import {
  getAssignment,
  getRoomDetail,
  joinRoom,
  updateWishlist,
} from "../lib/room-data.js";

const router = Router();
router.use("/rooms", requireAuth);

function normalizedRoomCode(value: unknown): string {
  return String(value ?? "").toUpperCase();
}

router.get("/rooms/:roomCode", (req, res) => {
  const parsed = GetRoomParams.safeParse({ roomCode: normalizedRoomCode(req.params.roomCode) });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const detail = getRoomDetail(parsed.data.roomCode, authenticatedUser(req).id);
  if (!detail) {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  res.json(GetRoomResponse.parse(detail));
});

router.post("/rooms/:roomCode/join", (req, res) => {
  const parsed = JoinRoomParams.safeParse({ roomCode: normalizedRoomCode(req.params.roomCode) });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const result = joinRoom(parsed.data.roomCode, authenticatedUser(req).id);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "closed") {
    res.status(409).json({ error: "Losowanie już się odbyło i pokój nie przyjmuje nowych osób." });
    return;
  }
  res.json(JoinRoomResponse.parse(result.detail));
});

router.put("/rooms/:roomCode/wishlist", (req, res) => {
  const params = UpdateWishlistParams.safeParse({
    roomCode: normalizedRoomCode(req.params.roomCode),
  });
  const body = UpdateWishlistBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Lista prezentów jest nieprawidłowa lub przekracza 3000 znaków." });
    return;
  }

  const result = updateWishlist(
    params.data.roomCode,
    authenticatedUser(req).id,
    body.data.text,
  );
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "not-member") {
    res.status(403).json({ error: "Dołącz do pokoju, aby edytować swoją listę." });
    return;
  }
  res.json(UpdateWishlistResponse.parse(result.wishlist));
});

router.get("/rooms/:roomCode/assignment", (req, res) => {
  const parsed = GetMyAssignmentParams.safeParse({
    roomCode: normalizedRoomCode(req.params.roomCode),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Nieprawidłowy kod pokoju." });
    return;
  }
  const result = getAssignment(parsed.data.roomCode, authenticatedUser(req).id);
  if (result.kind === "not-found") {
    res.status(404).json({ error: "Nie znaleziono pokoju." });
    return;
  }
  if (result.kind === "not-member") {
    res.status(403).json({ error: "Najpierw dołącz do pokoju." });
    return;
  }
  if (result.kind === "not-drawn") {
    res.status(409).json({ error: "Administrator nie rozpoczął jeszcze losowania." });
    return;
  }
  if (result.kind === "missing") {
    res.status(409).json({ error: "Nie znaleziono Twojego przydziału. Poproś administratora o reset losowania." });
    return;
  }
  res.json(GetMyAssignmentResponse.parse(result.assignment));
});

export default router;
