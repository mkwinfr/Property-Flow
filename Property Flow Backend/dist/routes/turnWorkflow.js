"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// ============ PUNCH LIST ITEMS ============
// GET /api/turns/:turnId/punch-items - Get all punch items for a turn
router.get('/turns/:turnId/punch-items', async (req, res) => {
    try {
        const { turnId } = req.params;
        const items = await prisma_1.prisma.punchListItem.findMany({
            where: { turnId: parseInt(turnId) },
            include: {
                assignedTo: true,
                completedBy: true,
                inventoryUsages: {
                    include: { inventoryItem: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(items);
    }
    catch (err) {
        console.error('Error fetching punch items:', err);
        res.status(500).json({ error: 'Server error fetching punch items' });
    }
});
// POST /api/turns/:turnId/punch-items - Create a punch item
router.post('/turns/:turnId/punch-items', async (req, res) => {
    try {
        const { turnId } = req.params;
        const { label, area = 'General', category = 'General', notes, assignedToUserId } = req.body;
        if (!label) {
            return res.status(400).json({ error: 'label is required' });
        }
        const item = await prisma_1.prisma.punchListItem.create({
            data: {
                turnId: parseInt(turnId),
                label,
                area,
                category,
                notes,
                status: client_1.PunchListItemStatus.OPEN,
                assignedToUserId: assignedToUserId ? parseInt(assignedToUserId) : null,
            },
            include: {
                assignedTo: true,
                inventoryUsages: { include: { inventoryItem: true } },
            },
        });
        // Log activity
        await prisma_1.prisma.turnActivityLog.create({
            data: {
                turnId: parseInt(turnId),
                activityType: client_1.TurnActivityType.ITEM_ADDED,
                details: { itemLabel: label, area },
                userId: req.body.userId || null,
            },
        });
        res.status(201).json(item);
    }
    catch (err) {
        console.error('Error creating punch item:', err);
        res.status(500).json({ error: 'Server error creating punch item' });
    }
});
// PATCH /api/turns/:turnId/punch-items/:itemId - Update punch item status & add inventory usage
router.patch('/turns/:turnId/punch-items/:itemId', async (req, res) => {
    try {
        const { turnId, itemId } = req.params;
        const { status, notes, assignedToUserId, inventoryUsages = [] } = req.body;
        const turnIdNum = parseInt(turnId);
        const itemIdNum = parseInt(itemId);
        // Verify turn exists
        const turn = await prisma_1.prisma.turn.findUnique({ where: { id: turnIdNum } });
        if (!turn) {
            return res.status(404).json({ error: 'Turn not found' });
        }
        // Update item
        const item = await prisma_1.prisma.punchListItem.update({
            where: { id: itemIdNum },
            data: {
                status: status || undefined,
                notes: notes || undefined,
                assignedToUserId: assignedToUserId ? parseInt(assignedToUserId) : undefined,
                completedAt: status === client_1.PunchListItemStatus.COMPLETE ? new Date() : undefined,
                completedByUserId: status === client_1.PunchListItemStatus.COMPLETE ? req.body.userId : undefined,
            },
            include: {
                assignedTo: true,
                completedBy: true,
                inventoryUsages: { include: { inventoryItem: true } },
            },
        });
        // Handle inventory usage updates
        if (inventoryUsages.length > 0 && status === client_1.PunchListItemStatus.COMPLETE) {
            for (const usage of inventoryUsages) {
                // Check if usage already exists
                const existingUsage = await prisma_1.prisma.punchItemInventoryUsage.findUnique({
                    where: {
                        punchListItemId_inventoryItemId: {
                            punchListItemId: itemIdNum,
                            inventoryItemId: parseInt(usage.inventoryItemId),
                        },
                    },
                });
                if (!existingUsage) {
                    // Create new usage
                    const inventory = await prisma_1.prisma.inventoryItem.findUnique({
                        where: { id: parseInt(usage.inventoryItemId) },
                    });
                    if (!inventory) {
                        return res.status(404).json({
                            error: `Inventory item ${usage.inventoryItemId} not found`,
                        });
                    }
                    await prisma_1.prisma.punchItemInventoryUsage.create({
                        data: {
                            punchListItemId: itemIdNum,
                            inventoryItemId: parseInt(usage.inventoryItemId),
                            quantityUsed: parseInt(usage.quantityUsed) || 1,
                            unitCost: inventory.unitCost,
                        },
                    });
                    // Decrement inventory
                    await prisma_1.prisma.inventoryItem.update({
                        where: { id: parseInt(usage.inventoryItemId) },
                        data: {
                            quantity: { decrement: parseInt(usage.quantityUsed) || 1 },
                        },
                    });
                    // Log inventory usage
                    await prisma_1.prisma.turnActivityLog.create({
                        data: {
                            turnId: turnIdNum,
                            activityType: client_1.TurnActivityType.INVENTORY_USED,
                            punchListItemId: itemIdNum,
                            inventoryItemId: parseInt(usage.inventoryItemId),
                            details: {
                                itemName: inventory.name,
                                quantityUsed: parseInt(usage.quantityUsed) || 1,
                                unitCost: inventory.unitCost,
                            },
                            userId: req.body.userId || null,
                        },
                    });
                }
            }
        }
        // Log activity
        if (status === client_1.PunchListItemStatus.COMPLETE) {
            await prisma_1.prisma.turnActivityLog.create({
                data: {
                    turnId: turnIdNum,
                    activityType: client_1.TurnActivityType.ITEM_COMPLETED,
                    punchListItemId: itemIdNum,
                    userId: req.body.userId || null,
                },
            });
        }
        res.json(item);
    }
    catch (err) {
        console.error('Error updating punch item:', err);
        res.status(500).json({ error: 'Server error updating punch item' });
    }
});
// DELETE /api/turns/:turnId/punch-items/:itemId - Delete punch item
router.delete('/turns/:turnId/punch-items/:itemId', async (req, res) => {
    try {
        const { turnId, itemId } = req.params;
        await prisma_1.prisma.punchListItem.delete({
            where: { id: parseInt(itemId) },
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting punch item:', err);
        res.status(500).json({ error: 'Server error deleting punch item' });
    }
});
// ============ INVENTORY ============
// GET /api/inventory - Get all inventory items with optional filtering
router.get('/inventory', async (req, res) => {
    try {
        const { category, search } = req.query;
        const where = {};
        if (category && category !== 'ALL') {
            where.category = category;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { tags: { hasSome: [search] } },
            ];
        }
        const items = await prisma_1.prisma.inventoryItem.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        res.json(items);
    }
    catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Server error fetching inventory' });
    }
});
// POST /api/inventory - Create inventory item
router.post('/inventory', async (req, res) => {
    try {
        const { name, sku, tags = [], category, quantity, unitCost, supplier } = req.body;
        if (!name || !sku || !category || !quantity || unitCost === undefined) {
            return res.status(400).json({
                error: 'name, sku, category, quantity, and unitCost are required',
            });
        }
        const item = await prisma_1.prisma.inventoryItem.create({
            data: {
                name,
                sku,
                tags,
                category,
                quantity: parseInt(quantity),
                unitCost: parseFloat(unitCost),
                supplier,
            },
        });
        res.status(201).json(item);
    }
    catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ error: 'SKU already exists' });
        }
        console.error('Error creating inventory item:', err);
        res.status(500).json({ error: 'Server error creating inventory item' });
    }
});
// PATCH /api/inventory/:itemId - Update inventory item
router.patch('/inventory/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { name, tags, quantity, unitCost, supplier } = req.body;
        const item = await prisma_1.prisma.inventoryItem.update({
            where: { id: parseInt(itemId) },
            data: {
                name: name || undefined,
                tags: tags || undefined,
                quantity: quantity !== undefined ? parseInt(quantity) : undefined,
                unitCost: unitCost !== undefined ? parseFloat(unitCost) : undefined,
                supplier: supplier || undefined,
            },
        });
        res.json(item);
    }
    catch (err) {
        console.error('Error updating inventory item:', err);
        res.status(500).json({ error: 'Server error updating inventory item' });
    }
});
// ============ PUNCH ITEM INVENTORY USAGE ============
// PATCH /api/punch-items-usage/:usageId - Override cost
router.patch('/punch-items-usage/:usageId', async (req, res) => {
    try {
        const { usageId } = req.params;
        const { costOverride } = req.body;
        if (costOverride === undefined) {
            return res.status(400).json({ error: 'costOverride is required' });
        }
        const usage = await prisma_1.prisma.punchItemInventoryUsage.update({
            where: { id: parseInt(usageId) },
            data: { costOverride: parseFloat(costOverride) },
            include: {
                punchListItem: true,
                inventoryItem: true,
            },
        });
        // Log cost override activity
        await prisma_1.prisma.turnActivityLog.create({
            data: {
                turnId: usage.punchListItem.turnId,
                activityType: client_1.TurnActivityType.COST_OVERRIDDEN,
                details: {
                    itemName: usage.inventoryItem.name,
                    originalCost: usage.unitCost,
                    newCost: costOverride,
                },
                userId: req.body.userId || null,
            },
        });
        res.json(usage);
    }
    catch (err) {
        console.error('Error overriding cost:', err);
        res.status(500).json({ error: 'Server error overriding cost' });
    }
});
// DELETE /api/punch-items-usage/:usageId - Remove inventory usage
router.delete('/punch-items-usage/:usageId', async (req, res) => {
    try {
        const { usageId } = req.params;
        const usage = await prisma_1.prisma.punchItemInventoryUsage.findUnique({
            where: { id: parseInt(usageId) },
        });
        if (!usage) {
            return res.status(404).json({ error: 'Usage not found' });
        }
        // Restore inventory quantity
        await prisma_1.prisma.inventoryItem.update({
            where: { id: usage.inventoryItemId },
            data: { quantity: { increment: usage.quantityUsed } },
        });
        await prisma_1.prisma.punchItemInventoryUsage.delete({
            where: { id: parseInt(usageId) },
        });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting usage:', err);
        res.status(500).json({ error: 'Server error deleting usage' });
    }
});
// ============ TURN WORKFLOW ============
// PATCH /api/turns/:turnId - Update turn status and get cost breakdown
router.patch('/turns/:turnId', async (req, res) => {
    try {
        const { turnId } = req.params;
        const { status, managerReviewNotes, reviewedByUserId } = req.body;
        const turnIdNum = parseInt(turnId);
        // Verify turn exists
        const turn = await prisma_1.prisma.turn.findUnique({
            where: { id: turnIdNum },
            include: { costBreakdown: true },
        });
        if (!turn) {
            return res.status(404).json({ error: 'Turn not found' });
        }
        // Update turn
        const updatedTurn = await prisma_1.prisma.turn.update({
            where: { id: turnIdNum },
            data: {
                status: status || undefined,
                managerReviewNotes: managerReviewNotes || undefined,
                reviewedByUserId: reviewedByUserId ? parseInt(reviewedByUserId) : undefined,
                reviewedAt: status === client_1.TurnStatus.PENDING_REVIEW ? new Date() : undefined,
            },
            include: {
                costBreakdown: true,
                punchListItems: {
                    include: { inventoryUsages: { include: { inventoryItem: true } } },
                },
                activityLogs: true,
            },
        });
        // Recalculate cost breakdown
        if (updatedTurn.costBreakdown) {
            const materialsCost = updatedTurn.punchListItems.reduce((sum, item) => {
                return (sum +
                    (item.inventoryUsages?.reduce((itemSum, usage) => {
                        const cost = usage.costOverride ?? usage.unitCost;
                        return itemSum + cost * usage.quantityUsed;
                    }, 0) || 0));
            }, 0);
            const updatedBreakdown = await prisma_1.prisma.turnCostBreakdown.update({
                where: { id: updatedTurn.costBreakdown.id },
                data: {
                    materialsCost,
                    totalCost: (updatedTurn.costBreakdown.laborCost || 0) + materialsCost + (updatedTurn.costBreakdown.vendorServicesCost || 0),
                },
            });
            updatedTurn.costBreakdown = updatedBreakdown;
        }
        // Log status change
        if (status) {
            await prisma_1.prisma.turnActivityLog.create({
                data: {
                    turnId: turnIdNum,
                    activityType: client_1.TurnActivityType.TURN_STATUS_CHANGED,
                    details: { newStatus: status },
                    userId: req.body.userId || null,
                },
            });
        }
        res.json(updatedTurn);
    }
    catch (err) {
        console.error('Error updating turn:', err);
        res.status(500).json({ error: 'Server error updating turn' });
    }
});
// GET /api/turns/:turnId/cost-breakdown - Get cost breakdown
router.get('/turns/:turnId/cost-breakdown', async (req, res) => {
    try {
        const { turnId } = req.params;
        let breakdown = await prisma_1.prisma.turnCostBreakdown.findUnique({
            where: { turnId: parseInt(turnId) },
        });
        if (!breakdown) {
            // Create if doesn't exist
            breakdown = await prisma_1.prisma.turnCostBreakdown.create({
                data: {
                    turnId: parseInt(turnId),
                    laborCost: 0,
                    materialsCost: 0,
                    vendorServicesCost: 0,
                    totalCost: 0,
                },
            });
        }
        res.json(breakdown);
    }
    catch (err) {
        console.error('Error fetching cost breakdown:', err);
        res.status(500).json({ error: 'Server error fetching cost breakdown' });
    }
});
// GET /api/turns/:turnId/activity-log - Get activity log
router.get('/turns/:turnId/activity-log', async (req, res) => {
    try {
        const { turnId } = req.params;
        const logs = await prisma_1.prisma.turnActivityLog.findMany({
            where: { turnId: parseInt(turnId) },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(logs);
    }
    catch (err) {
        console.error('Error fetching activity log:', err);
        res.status(500).json({ error: 'Server error fetching activity log' });
    }
});
// POST /api/turns/:turnId/mark-punch-list-complete - Mark punch list as complete
router.post('/turns/:turnId/mark-punch-list-complete', async (req, res) => {
    try {
        const { turnId } = req.params;
        const { userId } = req.body;
        const turnIdNum = parseInt(turnId);
        // Update turn status to PENDING_REVIEW
        const turn = await prisma_1.prisma.turn.update({
            where: { id: turnIdNum },
            data: { status: client_1.TurnStatus.PENDING_REVIEW },
        });
        // Log activity
        await prisma_1.prisma.turnActivityLog.create({
            data: {
                turnId: turnIdNum,
                activityType: client_1.TurnActivityType.PUNCH_LIST_COMPLETED,
                userId: userId || null,
            },
        });
        res.json(turn);
    }
    catch (err) {
        console.error('Error marking punch list complete:', err);
        res.status(500).json({ error: 'Server error marking punch list complete' });
    }
});
// POST /api/turns/:turnId/manager-approve - Manager approves turn (marks VACANT_READY)
router.post('/turns/:turnId/manager-approve', async (req, res) => {
    try {
        const { turnId } = req.params;
        const { userId, notes } = req.body;
        const turnIdNum = parseInt(turnId);
        const turn = await prisma_1.prisma.turn.update({
            where: { id: turnIdNum },
            data: {
                status: client_1.TurnStatus.VACANT_READY,
                managerReviewNotes: notes,
                reviewedByUserId: userId ? parseInt(userId) : null,
                reviewedAt: new Date(),
            },
        });
        // Log activity
        await prisma_1.prisma.turnActivityLog.create({
            data: {
                turnId: turnIdNum,
                activityType: client_1.TurnActivityType.MANAGER_APPROVED,
                details: { notes },
                userId: userId || null,
            },
        });
        res.json(turn);
    }
    catch (err) {
        console.error('Error approving turn:', err);
        res.status(500).json({ error: 'Server error approving turn' });
    }
});
// POST /api/turns/:turnId/manager-request-rework - Manager requests additional work
router.post('/turns/:turnId/manager-request-rework', async (req, res) => {
    try {
        const { turnId } = req.params;
        const { userId, notes, itemsToRework = [] } = req.body;
        const turnIdNum = parseInt(turnId);
        // Update turn back to IN_PROGRESS
        const turn = await prisma_1.prisma.turn.update({
            where: { id: turnIdNum },
            data: {
                status: client_1.TurnStatus.IN_PROGRESS,
                managerReviewNotes: notes,
                reviewedByUserId: userId ? parseInt(userId) : null,
                reviewedAt: new Date(),
            },
        });
        // If specific items need rework, reopen them
        if (itemsToRework.length > 0) {
            await prisma_1.prisma.punchListItem.updateMany({
                where: { id: { in: itemsToRework } },
                data: { status: client_1.PunchListItemStatus.OPEN, completedAt: null, completedByUserId: null },
            });
        }
        // Log activity
        await prisma_1.prisma.turnActivityLog.create({
            data: {
                turnId: turnIdNum,
                activityType: client_1.TurnActivityType.MANAGER_REQUESTED_REWORK,
                details: { notes, itemsToRework },
                userId: userId || null,
            },
        });
        res.json(turn);
    }
    catch (err) {
        console.error('Error requesting rework:', err);
        res.status(500).json({ error: 'Server error requesting rework' });
    }
});
exports.default = router;
//# sourceMappingURL=turnWorkflow.js.map