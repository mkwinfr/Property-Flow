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
          in: ['NOT_STARTED', 'IN_PROGRESS', 'READY', 'ON_HOLD'],
        },
      },
      include: {
        apartment: true,
      },
      orderBy: {
        targetReadyDate: 'asc',
      },
    });

    const units = turns.map((turn) => ({
      id: turn.id.toString(),
      unitNumber: turn.apartment.unitNumber,
      building: turn.apartment.building || undefined,
      status: formatLabel(turn.status) || turn.status,
      priority: undefined,
      technician: undefined,
      dueDate: turn.targetReadyDate?.toISOString(),
      notes: formatLabel(turn.type),
    }));

    res.json({ units });
  } catch (err) {
    console.error('Error fetching make-ready board', err);
    res.status(500).json({ error: 'Server error fetching make-ready board' });
  }
});

export default router;
