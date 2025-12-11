import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// POST /api/make-ready-turns -> Create from wizard
router.post('/make-ready-turns', async (req, res) => {
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

    // Create turn with all data
    const turn = await prisma.turn.create({
      data: {
        apartmentId: apartment.id,
        createdByUserId: 1, // Default user ID (should come from auth)
        type: (turnType || 'STANDARD_MOVE_OUT') as any,
        status: 'NOT_STARTED',
        priority: (priority || 'NORMAL') as any,
        moveOutDate: moveOutDate ? new Date(moveOutDate) : null,
        targetReadyDate: targetReadyDate ? new Date(targetReadyDate) : null,
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
      },
    });

    if (!turn) return res.status(404).json({ error: 'Turn not found' });

    res.json(turn);
  } catch (err) {
    console.error('Error fetching turn', err);
    res.status(500).json({ error: 'Server error fetching turn' });
  }
});

// PATCH /api/make-ready-turns/:id/tasks/:taskId -> Update task status
router.patch('/make-ready-turns/:id/tasks/:taskId', async (req, res) => {
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
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid turn id' });

  try {
    const turn = await prisma.turn.findUnique({
      where: { id },
      include: {
        apartment: true,
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
router.post('/open', async (req, res) => {
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

    const turn = await prisma.turn.create({
      data: {
        apartmentId,
        createdByUserId,
        type,
        status: 'NOT_STARTED',
        moveOutDate: moveOutDate ? new Date(moveOutDate) : undefined,
        targetReadyDate: targetReadyDate ? new Date(targetReadyDate) : undefined,
      },
    });

    res.status(201).json(turn);
  } catch (err) {
    console.error('Error opening turn', err);
    res.status(500).json({ error: 'Server error opening turn' });
  }
});

export default router;
