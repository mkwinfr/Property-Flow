// backend/src/routes/apartments.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET /api/apartments/:id/detail
router.get('/:id/detail', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid apartment id' });
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id },
      include: {
        property: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        turns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            tasks: true,
          },
        },
        vendorJobs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            vendor: true,
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            createdBy: true,
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: true,
          },
        },
      },
    });

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
