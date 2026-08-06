import { Router } from "express";
import type { NotificationRecord } from "../../shared/contracts.js";
import { authenticate, type AuthenticatedRequest } from "../auth/session.js";
import { db } from "../db/index.js";

const router = Router();
router.use(authenticate);

router.get("/notifications", (req: AuthenticatedRequest, res) => {
  const notifications = db.prepare(
    `SELECT id, type, title, message, entity_type AS entityType, entity_id AS entityId,
            read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
  ).all(req.auth!.id) as NotificationRecord[];
  res.json({ notifications, unread: notifications.filter((item) => !item.readAt).length });
});

router.patch("/notifications/:id/read", (req: AuthenticatedRequest, res) => {
  db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?")
    .run(new Date().toISOString(), String(req.params.id), req.auth!.id);
  res.status(204).end();
});

router.post("/notifications/read-all", (req: AuthenticatedRequest, res) => {
  db.prepare("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE user_id = ?")
    .run(new Date().toISOString(), req.auth!.id);
  res.status(204).end();
});

export default router;

