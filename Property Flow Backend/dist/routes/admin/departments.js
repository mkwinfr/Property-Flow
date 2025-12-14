"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin/departments.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
/**
 * GET /api/admin/departments
 * List all departments
 */
router.get('/', async (_req, res) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                roles: {
                    select: {
                        id: true,
                        key: true,
                        name: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return res.json(departments);
    }
    catch (error) {
        console.error('Error fetching departments:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/admin/departments/:id
 * Get department details
 */
router.get('/:id', async (req, res) => {
    try {
        const deptId = parseInt(req.params.id, 10);
        if (isNaN(deptId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }
        const department = await prisma.department.findUnique({
            where: { id: deptId },
            include: {
                roles: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }
        return res.json(department);
    }
    catch (error) {
        console.error('Error fetching department:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=departments.js.map