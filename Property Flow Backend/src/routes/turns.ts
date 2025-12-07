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
  } = req.body;

  if (!apartmentId || !type) {
    return res.status(400).json({ error: 'apartmentId and type are required' });
  }

  try {
    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
    });

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    if (apartment.turnStatus !== 'NONE' && apartment.turnStatus !== 'READY') {
      return res.status(400).json({ error: 'Apartment already in a turn state' });
    }

    const turn = await prisma.$transaction(async (tx) => {
      const newTurn = await tx.turn.create({
        data: {
          apartmentId,
          type,
          status: 'NOT_STARTED',
          moveOutDate: moveOutDate ? new Date(moveOutDate) : undefined,
          targetReadyDate: targetReadyDate ? new Date(targetReadyDate) : undefined,
        },
      });

      await tx.apartment.update({
        where: { id: apartmentId },
        data: {
          turnStatus: 'IN_PROGRESS',
          canShow: false,
          canLease: false,
        },
      });

      return newTurn;
    });

    res.status(201).json(turn);
  } catch (err) {
    console.error('Error opening turn', err);
    res.status(500).json({ error: 'Server error opening turn' });
  }
});

export default router;
