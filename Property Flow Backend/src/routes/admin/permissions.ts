// src/routes/admin/permissions.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/admin/permissions
 * List all permissions
 */
router.get('/', async (_req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });

    return res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/permissions/grouped
 * List permissions grouped by module
 */
router.get('/grouped', async (_req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });

    // Group permissions by module (first part of key before underscore)
    const grouped: { [key: string]: any[] } = {};
    for (const perm of permissions) {
      const module = perm.key.split('_')[0];
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(perm);
    }

    return res.json(grouped);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
