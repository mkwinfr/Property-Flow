import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

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
