"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/apartments.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const buildApartmentQuery = () => ({
    include: {
        propertyRel: true,
        buildingRel: true,
        floorPlan: true,
        workOrders: {
            orderBy: { createdAt: "desc" },
            take: 20,
        },
        turns: {
            orderBy: { createdAt: "desc" },
            take: 20,
        },
    },
});
/**
 * ---------------------------------------------
 * GET /api/apartments
 * List all apartments (lightweight response)
 * ---------------------------------------------
 */
router.get("/", async (_req, res) => {
    try {
        const apartments = await prisma.apartment.findMany({
            select: {
                id: true,
                unitNumber: true,
                building: true,
                beds: true,
                baths: true,
                status: true,
                property: true,
                minRent: true,
                maxRent: true,
                floorPlan: true,
            },
            orderBy: { id: "asc" },
        });
        return res.json(apartments);
    }
    catch (error) {
        console.error("Error fetching apartments list", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * ---------------------------------------------
 * GET /api/apartments/:id
 * Single apartment summary
 * ---------------------------------------------
 */
router.get("/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid apartment ID" });
    }
    try {
        const apartment = await prisma.apartment.findUnique({
            where: { id },
            select: {
                id: true,
                unitNumber: true,
                building: true,
                beds: true,
                baths: true,
                status: true,
                property: true,
                minRent: true,
                maxRent: true,
                floorPlan: true,
            },
        });
        if (!apartment) {
            return res.status(404).json({ error: "Apartment not found" });
        }
        return res.json(apartment);
    }
    catch (error) {
        console.error("Error fetching apartment", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * ---------------------------------------------
 * GET /api/apartments/:id/detail
 * Full apartment detail (turns, work orders, etc.)
 * ---------------------------------------------
 */
router.get("/:id/detail", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        return res.status(400).json({ error: "Invalid apartment id" });
    }
    try {
        const apartment = await prisma.apartment.findUnique({
            where: { id },
            ...buildApartmentQuery(),
        });
        if (!apartment) {
            return res.status(404).json({ error: "Apartment not found" });
        }
        return res.json(apartment);
    }
    catch (error) {
        console.error("Error fetching apartment detail", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=apartments.js.map