import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

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

    res.json(turns);
  } catch (err) {
    console.error('Error fetching make-ready board', err);
    res.status(500).json({ error: 'Server error fetching make-ready board' });
  }
});

export default router;
