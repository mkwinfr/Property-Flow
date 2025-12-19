import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

const formatLabel = (value: string | null | undefined) => {
  if (!value) return undefined;

  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

// GET /api/make-ready-board -> list active turns + apartment info
router.get('/', async (_req, res) => {
  try {
    const turns = await prisma.turn.findMany({
      where: {
        status: {
          in: ['PENDING', 'VACANT', 'IN_PROGRESS', 'PENDING_REVIEW'],
        },
      },
      include: {
        apartment: true,
        punchListItems: {
          orderBy: { createdAt: 'asc' },
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
      punchListItemCount: turn.punchListItems.length,
      completedCount: turn.punchListItems.filter((item) => item.status === 'COMPLETE').length,
    }));

    res.json({ units, turns });
  } catch (err) {
    console.error('Error fetching make-ready board', err);
    res.status(500).json({ error: 'Server error fetching make-ready board' });
  }
});

export default router;
