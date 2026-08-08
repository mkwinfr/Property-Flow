import { Router } from "express";
import { z } from "zod";
import { authenticate, userCan, type AuthenticatedRequest } from "../auth/session.js";
import { config } from "../config.js";
import { AppError, forbidden } from "../lib/errors.js";
import { askAssistant } from "./service.js";

const router = Router();

router.get("/assistant/status", (_req, res) => {
  res.json({ configuredModel: config.ollamaModel, ollamaUrl: config.ollamaUrl });
});

router.use(authenticate);

router.get("/assistant/health", async (_req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${config.ollamaUrl.replace(/\/$/, "")}/api/tags`, { signal: controller.signal });
    if (!response.ok) {
      return res.json({ ollama: "down", model: "unknown", configuredModel: config.ollamaModel });
    }
    const payload = await response.json() as { models?: Array<{ name: string }> };
    const names = (payload.models ?? []).map((model) => model.name);
    const modelReady = names.some((name) => name === config.ollamaModel || name.startsWith(`${config.ollamaModel}:`));
    res.json({ ollama: "up", model: modelReady ? "ready" : "missing", configuredModel: config.ollamaModel, installedModels: names.slice(0, 12) });
  } catch {
    res.json({ ollama: "down", model: "unknown", configuredModel: config.ollamaModel });
  } finally {
    clearTimeout(timeout);
  }
});

router.post("/properties/:propertyId/assistant", async (req: AuthenticatedRequest, res, next) => {
  try {
    const propertyId = String(req.params.propertyId);
    const question = z.string().trim().min(2).max(500).parse(req.body?.question);
    if (!["units:view", "turns:view", "workorders:view", "inspections:view", "inventory:view"].some((permission) => userCan(req.auth!.id, permission, propertyId))) throw forbidden();
    const result = await askAssistant(req.auth!.id, propertyId, question);
    res.json(result);
  } catch (error) { next(error instanceof Error && error.message.startsWith("The local assistant") ? new AppError(503, "ASSISTANT_UNAVAILABLE", error.message) : error); }
});

export default router;
