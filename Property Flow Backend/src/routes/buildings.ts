// backend/src/routes/buildings.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/buildings
 * List all buildings
 */
router.get("/", async (_req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      select: {
        id: true,
        propertyId: true,
        buildingNumber: true,
        name: true,
        floors: true,
        unitsPerFloor: true,
      },
      orderBy: { buildingNumber: "asc" },
    });

    return res.json(buildings);
  } catch (error) {
    console.error("Error fetching buildings", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/buildings/:buildingId
 * Get a specific building with its apartments
 */
router.get("/:buildingId", async (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId, 10);
    if (isNaN(buildingId)) {
      return res.status(400).json({ error: "Invalid buildingId" });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        apartments: {
          select: {
            id: true,
            unitNumber: true,
            beds: true,
            baths: true,
            status: true,
          },
          orderBy: { unitNumber: "asc" },
        },
      },
    });

    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }

    return res.json(building);
  } catch (error) {
    console.error("Error fetching building", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/buildings/:buildingId/apartments
 * Get apartments for a specific building
 */
router.get("/:buildingId/apartments", async (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId, 10);
    if (isNaN(buildingId)) {
      return res.status(400).json({ error: "Invalid buildingId" });
    }

    const apartments = await prisma.apartment.findMany({
      where: { buildingId },
      select: {
        id: true,
        propertyId: true,
        buildingId: true,
        unitNumber: true,
        beds: true,
        baths: true,
        status: true,
      },
      orderBy: { unitNumber: "asc" },
    });

    return res.json(apartments);
  } catch (error) {
    console.error("Error fetching apartments for building", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
