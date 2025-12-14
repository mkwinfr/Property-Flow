"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.getUserPermissions = getUserPermissions;
// src/utils/permissions.ts
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function hasPermission(userId, permissionKey) {
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
        return user.role.permissions.some((rp) => rp.permission.key === permissionKey);
    }
    catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}
async function getUserPermissions(userId) {
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
    }
    catch (error) {
        console.error('Error fetching user permissions:', error);
        return [];
    }
}
//# sourceMappingURL=permissions.js.map