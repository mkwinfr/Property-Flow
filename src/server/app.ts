import path from "node:path";
import fs from "node:fs";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import authRoutes from "./auth/routes.js";
import portfolioRoutes from "./portfolio/routes.js";
import turnRoutes from "./turns/routes.js";
import operationsRoutes from "./operations/routes.js";
import notificationRoutes from "./notifications/routes.js";
import attachmentRoutes from "./attachments/routes.js";
import adminRoutes from "./admin/routes.js";
import searchRoutes from "./search/routes.js";
import assistantRoutes from "./assistant/routes.js";
import platformRoutes from "./platform/routes.js";
import residentsRoutes from "./residents/routes.js";
import leasingRoutes from "./leasing/routes.js";
import communicationsRoutes from "./communications/routes.js";
import financialRoutes from "./financial/routes.js";
import platformAdminRoutes from "./platform-admin/routes.js";
import portalRoutes from "./portal/routes.js";
import { AppError } from "./lib/errors.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  // A 5 MB file becomes roughly 6.7 MB when base64 encoded for the local provider.
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "property-suite" }));
  app.use("/api/auth", authRoutes);
  // Portal routes must register before staff routers that call router.use(authenticate),
  // otherwise residents cannot sign in unless they also have a staff session cookie.
  app.use("/api", portalRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", portfolioRoutes);
  app.use("/api", turnRoutes);
  app.use("/api", operationsRoutes);
  app.use("/api", notificationRoutes);
  app.use("/api", attachmentRoutes);
  app.use("/api", searchRoutes);
  app.use("/api", assistantRoutes);
  app.use("/api", platformRoutes);
  app.use("/api", residentsRoutes);
  app.use("/api", leasingRoutes);
  app.use("/api", communicationsRoutes);
  app.use("/api", financialRoutes);
  app.use("/api", platformAdminRoutes);

  app.use("/api", (_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));

  const clientPath = path.join(process.cwd(), "dist");
  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get("/{*path}", (_req, res) => res.sendFile(path.join(clientPath, "index.html")));
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Check the highlighted information", issues: error.issues },
      });
    }
    if (error instanceof AppError) {
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    console.error(error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    });
  });
  return app;
}
