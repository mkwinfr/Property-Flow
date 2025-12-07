import { Router } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

// GET /api/apartments -> list all apartments
router.get('/', async (_req, res) => {
  try {
    const apartments = await prisma.apartment.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(apartments);
  } catch (err) {
    console.error('Error fetching apartments', err);
    res.status(500).json({ error: 'Server error fetching apartments' });
  }
});

// GET /api/apartments/:id -> single apartment with its turns
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid apartment id' });

  try {
    const apartment = await prisma.apartment.findUnique({
      where: { id },
      include: {
        turns: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!apartment) return res.status(404).json({ error: 'Apartment not found' });

    res.json(apartment);
  } catch (err) {
    console.error('Error fetching apartment', err);
    res.status(500).json({ error: 'Server error fetching apartment' });
  }
});

// POST /api/apartments -> create a basic apartment (for testing)
router.post('/', async (req, res) => {
  try {
    const { unitNumber, building, bedrooms, bathrooms, sqft } = req.body;

    if (!unitNumber) {
      return res.status(400).json({ error: 'unitNumber is required' });
    }

    const apartment = await prisma.apartment.create({
      data: {
        unitNumber,
        building,
        bedrooms,
        bathrooms,
        sqft,
      },
    });

    res.status(201).json(apartment);
  } catch (err) {
    console.error('Error creating apartment', err);
    res.status(500).json({ error: 'Server error creating apartment' });
  }
});

export default router;
