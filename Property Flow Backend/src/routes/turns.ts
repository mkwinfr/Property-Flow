import { Router } from 'express';
import { prisma } from '../db/prisma';
import { OccupancyStatus } from '@prisma/client';
import { getPunchListItems } from '../utils/punchListTemplate';

const router = Router();

// POST /api/turns/make-ready-turns -> Create from wizard
router.post('/turns/make-ready-turns', async (req, res) => {
  const {
    propertyId,
    unitId,
    turnType,
    moveOutDate,
    targetReadyDate,
    priority,
    turnOwnerId,
    turnNotes,
    overallCondition,
    conditionTags = [],
    photoNotes,
    wallsCondition,
    flooringCondition,
    doorsLocksCondition,
    plumbingCondition,
    electricalCondition,
    appliancesCondition,
    cleanlinessCondition,
    hasLifeSafetyIssues,
    lifeSafetyNotes,
    selectedCategories = [],
    tasks = [],
    materials = [],
    estimatedLaborCost,
    estimatedMaterialsCost,
    accessInstructions,
    alarmCodes,
    chargebackType,
    chargebackAmount,
    chargebackReason,
  } = req.body;

  // Validation
  if (!unitId) {
    return res.status(400).json({ error: 'unitId is required' });
  }

  try {
    // For now, map unitId to apartmentId (adjust as needed based on your data model)
    const apartment = await prisma.apartment.findFirst({
      where: { unitNumber: unitId },
    });

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found for unit' });
    }

    const parsedMoveOut = moveOutDate ? new Date(moveOutDate) : null;
    const parsedTargetReady = targetReadyDate ? new Date(targetReadyDate) : null;

    // Decide new occupancy status based on move-out date
    const now = new Date();
    const newStatus: OccupancyStatus =
      parsedMoveOut && parsedMoveOut <= now ? OccupancyStatus.VACANT : OccupancyStatus.NOTICE;

    // Update apartment occupancy status to reflect the turn creation
    await prisma.apartment.update({
      where: { id: apartment.id },
      data: { status: newStatus },
    });

    // Get punch list items based on apartment bed/bath configuration
    const punchListItems = getPunchListItems(apartment.beds || undefined, apartment.baths || undefined);

    // Create turn with all data
    const turn = await prisma.turn.create({
      data: {
        apartmentId: apartment.id,
        createdByUserId: 1, // Default user ID (should come from auth)
        type: (turnType || 'STANDARD_MOVE_OUT') as any,
        status: 'PENDING',
        priority: (priority || 'NORMAL') as any,
        moveOutDate: parsedMoveOut,
        targetReadyDate: parsedTargetReady,
        overallCondition: (overallCondition || null) as any,
        photoNotes,
        wallsCondition,
        flooringCondition,
        doorsLocksCondition,
        plumbingCondition,
        electricalCondition,
        appliancesCondition,
        cleanlinessCondition,
        hasLifeSafetyIssues: hasLifeSafetyIssues || false,
        lifeSafetyNotes,
        turnOwnerId,
        accessInstructions,
        alarmCodes,
        estimatedLaborCost: estimatedLaborCost ? Number(estimatedLaborCost) : null,
        estimatedMaterialsCost: estimatedMaterialsCost ? Number(estimatedMaterialsCost) : null,
        totalEstimatedCost: estimatedLaborCost && estimatedMaterialsCost
          ? Number(estimatedLaborCost) + Number(estimatedMaterialsCost)
          : null,
        chargebackType: (chargebackType || 'NONE') as any,
        chargebackAmount: chargebackAmount ? Number(chargebackAmount) : null,
        chargebackReason,
        turnNotes,

        // Create condition tags
        conditionTags: {
          create: conditionTags.map((tag: string) => ({ tag: tag as any })),
        },

        // Create work categories
        workCategories: {
          create: selectedCategories.map((cat: string) => ({ category: cat as any })),
        },

        // Create punch list items based on bed/bath configuration
        punchListItems: {
          create: punchListItems.map((item, idx) => ({
            label: item.label,
            area: item.area,
            category: item.category,
            status: 'OPEN',
          })),
        },

        // Create tasks
        tasks: {
          create: tasks.map((task: any, idx: number) => ({
            title: task.title,
            category: task.category || 'GENERAL_MAINTENANCE',
            area: task.area || 'WHOLE_UNIT',
            priority: (task.priority || 'NORMAL') as any,
            status: 'PENDING',
            estimatedEffortValue: task.estimatedEffortValue,
            estimatedEffortUnit: task.estimatedEffortUnit,
            internalNotes: task.internalNotes,
            vendorNotes: task.vendorNotes,
            budgetedCost: task.budgetedCost ? Number(task.budgetedCost) : null,
            billableTo: task.billableTo,
            mustCompleteBy: task.mustCompleteBy ? new Date(task.mustCompleteBy) : null,
            startDate: task.startDate ? new Date(task.startDate) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            isAllDay: task.isAllDay || false,
            startTime: task.startTime,
            endTime: task.endTime,
            sortOrder: idx,
          })),
        },

        // Create materials
        materials: {
          create: materials.map((mat: any) => ({
            item: mat.item,
            category: mat.category || 'GENERAL_MAINTENANCE',
            quantity: Number(mat.quantity),
            unit: mat.unit,
            costPerUnit: mat.costPerUnit ? Number(mat.costPerUnit) : null,
            storeOrVendor: mat.storeOrVendor,
          })),
        },
      },
      include: {
        tasks: true,
        materials: true,
        conditionTags: true,
        workCategories: true,
        punchListItems: true,
      },
    });

    res.status(201).json(turn);
  } catch (err) {
    console.error('Error creating make-ready turn', err);
    res.status(500).json({ error: 'Server error creating turn' });
  }
});

// GET /api/make-ready-turns/:id -> single turn with all details
router.get('/make-ready-turns/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid turn id' });

  try {
    const turn = await prisma.turn.findUnique({
      where: { id },
      include: {
        apartment: true,
        tasks: {
          orderBy: { sortOrder: 'asc' },
        },
        materials: true,
        conditionTags: true,
        workCategories: true,
        punchListItems: true,
      },
    });

    if (!turn) return res.status(404).json({ error: 'Turn not found' });

    res.json(turn);
  } catch (err) {
    console.error('Error fetching turn', err);
    res.status(500).json({ error: 'Server error fetching turn' });
  }
});

// POST /api/turns/:id/generate-punch-list -> Generate all punch items from template (bulk create)
router.post('/turns/:id/generate-punch-list', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid turn id' });

  try {
    // Get turn with apartment details for bed/bath count
    const turn = await prisma.turn.findUnique({
      where: { id },
      include: {
        apartment: {
          include: {
            floorPlan: true,
          },
        },
        punchListItems: true,
      },
    });

    if (!turn) return res.status(404).json({ error: 'Turn not found' });

    const beds = turn.apartment?.beds || turn.apartment?.floorPlan?.bedrooms || 1;
    const baths = turn.apartment?.baths || turn.apartment?.floorPlan?.bathrooms || 1;

    // Get all template items that should exist
    const templateItems = getPunchListItems(beds, baths);
    const expectedCount = templateItems.length;
    const actualCount = turn.punchListItems?.length || 0;

    // If all items exist, return them
    if (actualCount >= expectedCount) {
      console.log(`[Generate Punch List] All ${actualCount} items already exist for ${beds}B/${baths}B`);
      return res.json({ 
        message: 'Punch items already complete', 
        items: turn.punchListItems,
        stats: { expectedCount, actualCount, createdCount: 0 },
      });
    }

    // Partial generation detected - create missing items
    const existingKeys = new Set(turn.punchListItems?.map(item => item.templateKey) || []);
    const missingItems = templateItems.filter(item => {
      const templateKey = `${item.area}-${item.label}`.toLowerCase().replace(/\s+/g, '-');
      return !existingKeys.has(templateKey);
    });

    console.log(`[Generate Punch List] Creating ${missingItems.length} missing items (had ${actualCount}/${expectedCount})`);

    // Create missing items
    if (missingItems.length > 0) {
      await prisma.punchListItem.createMany({
        data: missingItems.map((item) => ({
          turnId: id,
          templateKey: `${item.area}-${item.label}`.toLowerCase().replace(/\s+/g, '-'),
          label: item.label,
          area: item.area,
          category: item.category,
          status: 'OPEN' as any,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch all items to return
    const allItems = await prisma.punchListItem.findMany({
      where: { turnId: id },
      orderBy: [{ area: 'asc' }, { label: 'asc' }],
    });

    res.json({ 
      message: `Completed punch list generation`, 
      items: allItems,
      stats: { expectedCount, actualCount, createdCount: missingItems.length },
    });
  } catch (err) {
    console.error('Error generating punch list', err);
    res.status(500).json({ error: 'Server error generating punch list' });
  }
});

// PATCH /api/turns/make-ready-turns/:id/tasks/:taskId -> Update task status
router.patch('/turns/make-ready-turns/:id/tasks/:taskId', async (req, res) => {
  const turnId = Number(req.params.id);
  const taskId = Number(req.params.taskId);
  const { status } = req.body;

  if (Number.isNaN(turnId) || Number.isNaN(taskId)) {
    return res.status(400).json({ error: 'Invalid IDs' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const task = await prisma.turnTask.update({
      where: { id: taskId },
      data: {
        status: status as any,
      },
    });

    res.json(task);
  } catch (err) {
    console.error('Error updating task', err);
    res.status(500).json({ error: 'Server error updating task' });
  }
});

// GET /api/turns/:id -> single turn with apartment
router.get('/turns/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid turn id' });

  try {
    const turn = await prisma.turn.findUnique({
      where: { id },
      include: {
        apartment: {
          include: {
            floorPlan: true,
          },
        },
        punchListItems: true,
        activityLogs: true,
        costBreakdown: true,
      },
    });

    if (!turn) return res.status(404).json({ error: 'Turn not found' });

    res.json(turn);
  } catch (err) {
    console.error('Error fetching turn', err);
    res.status(500).json({ error: 'Server error fetching turn' });
  }
});

// POST /api/turns/open -> basic "punch wizard" that opens a new turn
router.post('/turns/open', async (req, res) => {
  const {
    apartmentId,
    type,              // e.g. "FULL_TURN"
    moveOutDate,
    targetReadyDate,
    createdByUserId,
  } = req.body;

  if (!apartmentId || !type || !createdByUserId) {
    return res.status(400).json({ error: 'apartmentId, createdByUserId and type are required' });
  }

  try {
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    // Get punch list items based on apartment bed/bath configuration
    const punchListItems = getPunchListItems(apartment.beds || undefined, apartment.baths || undefined);

    const turn = await prisma.turn.create({
      data: {
        apartmentId,
        createdByUserId,
        type,
        status: 'PENDING',
        moveOutDate: moveOutDate ? new Date(moveOutDate) : undefined,
        targetReadyDate: targetReadyDate ? new Date(targetReadyDate) : undefined,
        // Create punch list items based on bed/bath configuration
        punchListItems: {
          create: punchListItems.map((item) => ({
            label: item.label,
            area: item.area,
            category: item.category,
            status: 'OPEN',
          })),
        },
      },
      include: {
        punchListItems: true,
      },
    });

    res.status(201).json(turn);
  } catch (err) {
    console.error('Error opening turn', err);
    res.status(500).json({ error: 'Server error opening turn' });
  }
});

// PATCH /api/turns/:turnId/punch-items/:itemId -> Update punch list item (with upsert for template items)
router.patch('/turns/:turnId/punch-items/:itemId', async (req, res) => {
  const turnId = Number(req.params.turnId);
  const itemId = Number(req.params.itemId);
  const { status, notes, inventoryUsages, templateKey, label, area, category } = req.body;

  if (Number.isNaN(turnId) || Number.isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid turn or item id' });
  }

  try {
    // Check if turn exists
    const turn = await prisma.turn.findUnique({ where: { id: turnId } });
    if (!turn) {
      return res.status(404).json({ error: 'Turn not found' });
    }

    // Check if item exists - template items won't exist until first save
    let existingItem = await prisma.punchListItem.findUnique({ where: { id: itemId } });
    
    let item;
    if (!existingItem && templateKey) {
      // Create new item from template data
      item = await prisma.punchListItem.create({
        data: {
          turnId: turnId,
          templateKey: templateKey,
          label: label || 'Punch Item',
          area: area || 'General',
          category: category || 'General',
          status: status || 'OPEN',
          notes: notes || undefined,
          completedAt: status === 'COMPLETE' ? new Date() : undefined,
        },
      });
    } else if (!existingItem) {
      return res.status(404).json({ error: 'Punch item not found. Provide templateKey to create new item.' });
    } else {
      // Update existing item
      item = await prisma.punchListItem.update({
        where: { id: itemId },
        data: {
          status: status || undefined,
          notes: notes || undefined,
          completedAt: status === 'COMPLETE' ? new Date() : undefined,
        },
      });
    }

    res.json(item);
  } catch (err) {
    console.error('Error updating punch list item', err);
    res.status(500).json({ error: 'Server error updating punch list item' });
  }
});

export default router;
