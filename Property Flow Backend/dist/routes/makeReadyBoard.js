"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const router = (0, express_1.Router)();
const formatLabel = (value) => {
    if (!value)
        return undefined;
    return value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};
// GET /api/make-ready-board -> list active turns + apartment info
router.get('/', async (_req, res) => {
    try {
        const turns = await prisma_1.prisma.turn.findMany({
            where: {
                status: {
                    in: ['NOT_STARTED', 'IN_PROGRESS', 'READY', 'ON_HOLD'],
                },
            },
            include: {
                apartment: true,
                tasks: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: {
                targetReadyDate: 'asc',
            },
        });
        const units = turns.map((turn) => ({
            id: turn.id.toString(),
            unitNumber: turn.apartment.unitNumber,
            building: turn.apartment.building || undefined,
            status: turn.status,
            priority: turn.priority,
            technician: turn.turnOwnerId,
            dueDate: turn.targetReadyDate?.toISOString(),
            notes: turn.turnNotes,
            taskCount: turn.tasks.length,
            completedCount: turn.tasks.filter((t) => t.status === 'DONE').length,
        }));
        res.json({ units, turns });
    }
    catch (err) {
        console.error('Error fetching make-ready board', err);
        res.status(500).json({ error: 'Server error fetching make-ready board' });
    }
});
exports.default = router;
//# sourceMappingURL=makeReadyBoard.js.map