// src/routes/admin/departments.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/admin/departments
 * List all departments
 */
router.get('/', async (_req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        roles: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/departments/:id
 * Get department details
 */
router.get('/:id', async (req, res) => {
  try {
    const deptId = parseInt(req.params.id, 10);
    if (isNaN(deptId)) {
      return res.status(400).json({ error: 'Invalid department ID' });
    }

    const department = await prisma.department.findUnique({
      where: { id: deptId },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    return res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
