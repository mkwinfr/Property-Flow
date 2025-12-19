"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/properties.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
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
    }
    catch (error) {
        console.error("Error fetching properties:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=properties.js.map