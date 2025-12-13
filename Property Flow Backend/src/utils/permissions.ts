// src/utils/permissions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function hasPermission(
  userId: number,
  permissionKey: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
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

    if (!user || !user.role) {
      return false;
    }

    return user.role.permissions.some(
      (rp) => rp.permission.key === permissionKey
    );
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
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

    if (!user || !user.role) {
      return [];
    }

    return user.role.permissions.map((rp) => rp.permission.key);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}
