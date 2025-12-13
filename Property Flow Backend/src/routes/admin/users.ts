// src/routes/admin/users.ts
import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword, generateTemporaryPassword } from '../../utils/auth';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleId: true,
        role: {
          select: {
            id: true,
            key: true,
            name: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        status: true,
        propertyId: true,
        lastLoginAt: true,
        createdAt: true,
        userRole: true, // legacy field
        properties: {
          select: {
            property: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userNotes: true,
        roleId: true,
        role: {
          select: {
            id: true,
            key: true,
            name: true,
            department: {
              select: { id: true, name: true },
            },
            permissions: {
              include: { permission: true },
            },
          },
        },
        status: true,
        propertyId: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
        userRole: true, // legacy field
        properties: {
          select: {
            property: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user with temporary password
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, roleId, propertyId, propertyIds, phone, userNotes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Validate email format
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Validate roleId if provided
    let role = null;
    if (roleId) {
      role = await prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!role) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: roleId || null,
        propertyId: propertyId || null,
        phone: phone || null,
        userNotes: userNotes || null,
        status: 'ACTIVE',
        userRole: (['SYSTEM_ADMIN', 'ADMIN'].includes(role?.key || '') ? 'SUPER_ADMIN' : 
                   role?.key?.includes('MAINTENANCE') ? 'MAINTENANCE_TEAM' : 
                   role?.key?.includes('VENDOR') ? 'VENDOR' : 'VIEWER') as UserRole,
        properties: {
          create: (propertyIds || (propertyId ? [propertyId] : [])).map((pid: number) => ({
            propertyId: pid,
          })),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: {
          select: {
            id: true,
            key: true,
            name: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        status: true,
        propertyId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      user,
      temporaryPassword: tempPassword,
      message: 'User created successfully. Please send the temporary password to the user.',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Edit user details
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { name, email, roleId, status, propertyId, propertyIds, phone, userNotes } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate email if provided and different
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Validate roleId if provided
    let role = null;
    if (roleId) {
      role = await prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!role) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(roleId !== undefined && { roleId: roleId || null }),
        ...(status && { status }),
        ...(propertyId !== undefined && { propertyId: propertyId || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(userNotes !== undefined && { userNotes: userNotes || null }),
        ...(role && { 
          userRole: (['SYSTEM_ADMIN', 'ADMIN'].includes(role?.key || '') ? 'SUPER_ADMIN' : 
                     role?.key?.includes('MAINTENANCE') ? 'MAINTENANCE_TEAM' : 
                     role?.key?.includes('VENDOR') ? 'VENDOR' : 'VIEWER') as UserRole
        }),
        ...(propertyIds && {
          properties: {
            deleteMany: {},
            create: propertyIds.map((pid: number) => ({
              propertyId: pid,
            })),
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        userNotes: true,
        roleId: true,
        role: {
          select: {
            id: true,
            key: true,
            name: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
        status: true,
        propertyId: true,
        createdAt: true,
        properties: {
          select: {
            property: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    return res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deactivate user (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete: set status to INACTIVE
    const deactivatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    return res.json({
      message: 'User deactivated successfully',
      user: deactivatedUser,
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password (admin function)
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: null, // Force password change on next login
      },
    });

    // TODO: Send email with new temporary password
    return res.json({
      message: 'Password reset successful. Please send the temporary password to the user.',
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
