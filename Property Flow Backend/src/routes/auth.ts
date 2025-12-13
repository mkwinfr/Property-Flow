// src/routes/auth.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../utils/auth';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'User account is not active' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.userRole,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.userRole,
        passwordChangedAt: user.passwordChangedAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password (requires token)
 */
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    if (!user.password || !(await verifyPassword(oldPassword, user.password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and mark password as changed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
