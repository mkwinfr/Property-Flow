// backend/src/routes/apartments.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const buildApartmentQuery = () => ({
  include: {
    property: true,
    workOrders: {
      orderBy: { createdAt: 'desc' as const },
      take: 20,
    },
    turns: {
      orderBy: { createdAt: 'desc' as const },
      take: 5,
      include: {
        tasks: true,
      },
    },
    vendorJobs: {
      orderBy: { createdAt: 'desc' as const },
      take: 10,
      include: {
        vendor: true,
      },
    },
    notes: {
      orderBy: { createdAt: 'desc' as const },
      take: 20,
      include: {
        createdBy: true,
      },
    },
    attachments: {
      orderBy: { createdAt: 'desc' as const },
      take: 20,
    },
    activityLogs: {
      orderBy: { createdAt: 'desc' as const },
      take: 50,
      include: {
        user: true,
      },
    },
  },
});

const getApartmentById = async (id: number) =>
  prisma.apartment.findUnique({
    where: { id },
    ...buildApartmentQuery(),
  });

// GET /api/apartments
router.get('/', async (_req, res) => {
  try {
    const apartments = await prisma.apartment.findMany({
      orderBy: [{ building: 'asc' }, { unitNumber: 'asc' }],
    });

    return res.json(apartments);
  } catch (error) {
    console.error('Error fetching apartments list', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apartments/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid apartment id' });
    }

    const apartment = await getApartmentById(id);

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    return res.json(apartment);
  } catch (error) {
    console.error('Error fetching apartment', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apartments/:id/detail
router.get('/:id/detail', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid apartment id' });
    }

    const apartment = await getApartmentById(id);

    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    return res.json(apartment);
  } catch (error) {
    console.error('Error fetching apartment detail', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
