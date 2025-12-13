// src/routes/properties.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// GET /api/properties - list properties for assignment/selection
router.get("/", async (_req, res) => {
  try {
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: [{ name: "asc" }],
    });

    return res.json(properties);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
