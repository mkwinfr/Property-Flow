// src/routes/admin/roles.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/admin/roles
 * List all roles with departments
 */
router.get('/', async (_req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        department: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    });

    return res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/roles/:id
 * Get role details with permissions
 */
router.get('/:id', async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        department: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    return res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/roles/:id/permissions
 * Update role permissions
 */
router.put('/:id/permissions', async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }

    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: 'permissionIds must be an array' });
    }

    // Fetch the role to check if it exists and is not System Admin
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent removing all permissions from System Admin
    if (role.key === 'SYSTEM_ADMIN' && permissionIds.length === 0) {
      return res.status(400).json({
        error: 'System Admin role must retain permissions',
      });
    }

    // Delete existing permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Create new permissions
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.create({
        data: {
          roleId,
          permissionId,
        },
      });
    }

    // Fetch updated role
    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        department: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return res.json(updatedRole);
  } catch (error) {
    console.error('Error updating role permissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
