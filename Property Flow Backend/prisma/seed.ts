// prisma/seed.ts
import { PrismaClient, OccupancyStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedFloorPlans } from './seeds/seedFloorPlans';
import { seedWaterfordApartments } from './seeds/seedWaterfordApartments';

const prisma = new PrismaClient();

// Department definitions
const DEPARTMENTS = [
  { key: 'EXECUTIVE_OWNERSHIP', name: 'Executive / Ownership' },
  { key: 'PROPERTY_OPERATIONS', name: 'Property Operations' },
  { key: 'MAINTENANCE', name: 'Maintenance' },
  { key: 'LEASING_RESIDENT_SERVICES', name: 'Leasing & Resident Services' },
  { key: 'ACCOUNTING_FINANCE', name: 'Accounting & Finance' },
  { key: 'ADMINISTRATION_COMPLIANCE', name: 'Administration & Compliance' },
  { key: 'CORPORATE_SHARED_SERVICES', name: 'Corporate / Shared Services' },
  { key: 'SYSTEM_LEVEL', name: 'System-Level / Access Roles' },
];

// Role definitions
const ROLES = [
  // Executive / Ownership
  { key: 'OWNER_PRINCIPAL', name: 'Owner / Principal', department: 'EXECUTIVE_OWNERSHIP' },
  { key: 'MANAGING_PARTNER', name: 'Managing Partner', department: 'EXECUTIVE_OWNERSHIP' },
  { key: 'REGIONAL_DIRECTOR', name: 'Regional Director', department: 'EXECUTIVE_OWNERSHIP' },
  { key: 'PORTFOLIO_MANAGER', name: 'Portfolio Manager', department: 'EXECUTIVE_OWNERSHIP' },
  // Property Operations
  { key: 'PROPERTY_MANAGER', name: 'Property Manager', department: 'PROPERTY_OPERATIONS' },
  { key: 'ASST_PROPERTY_MANAGER', name: 'Assistant Property Manager', department: 'PROPERTY_OPERATIONS' },
  { key: 'COMMUNITY_MANAGER', name: 'Community Manager', department: 'PROPERTY_OPERATIONS' },
  { key: 'ONSITE_MANAGER', name: 'On-Site Manager', department: 'PROPERTY_OPERATIONS' },
  { key: 'FLOATING_PROPERTY_MANAGER', name: 'Floating Property Manager', department: 'PROPERTY_OPERATIONS' },
  // Maintenance
  { key: 'MAINTENANCE_SUPERVISOR', name: 'Maintenance Supervisor', department: 'MAINTENANCE' },
  { key: 'LEAD_MAINTENANCE_TECH', name: 'Lead Maintenance Technician', department: 'MAINTENANCE' },
  { key: 'MAINTENANCE_TECH', name: 'Maintenance Technician', department: 'MAINTENANCE' },
  { key: 'MAKE_READY_TECH', name: 'Make Ready Technician', department: 'MAINTENANCE' },
  { key: 'GROUNDSKEEPER_PORTER', name: 'Groundskeeper / Porter', department: 'MAINTENANCE' },
  { key: 'FACILITIES_MANAGER', name: 'Facilities Manager', department: 'MAINTENANCE' },
  // Leasing & Resident Services
  { key: 'LEASING_MANAGER', name: 'Leasing Manager', department: 'LEASING_RESIDENT_SERVICES' },
  { key: 'LEASING_AGENT', name: 'Leasing Agent', department: 'LEASING_RESIDENT_SERVICES' },
  { key: 'RESIDENT_SERVICES_COORD', name: 'Resident Services Coordinator', department: 'LEASING_RESIDENT_SERVICES' },
  { key: 'RENEWALS_SPECIALIST', name: 'Renewals Specialist', department: 'LEASING_RESIDENT_SERVICES' },
  // Accounting & Finance
  { key: 'ACCOUNTING_MANAGER', name: 'Accounting Manager', department: 'ACCOUNTING_FINANCE' },
  { key: 'ACCOUNTS_PAYABLE_CLERK', name: 'Accounts Payable Clerk', department: 'ACCOUNTING_FINANCE' },
  { key: 'ACCOUNTS_RECEIVABLE_CLERK', name: 'Accounts Receivable Clerk', department: 'ACCOUNTING_FINANCE' },
  { key: 'PROPERTY_ACCOUNTANT', name: 'Property Accountant', department: 'ACCOUNTING_FINANCE' },
  { key: 'CONTROLLER', name: 'Controller', department: 'ACCOUNTING_FINANCE' },
  { key: 'PAYROLL_SPECIALIST', name: 'Payroll Specialist', department: 'ACCOUNTING_FINANCE' },
  // Administration & Compliance
  { key: 'OFFICE_MANAGER', name: 'Office Manager', department: 'ADMINISTRATION_COMPLIANCE' },
  { key: 'ADMIN_ASSISTANT', name: 'Administrative Assistant', department: 'ADMINISTRATION_COMPLIANCE' },
  { key: 'COMPLIANCE_SPECIALIST', name: 'Compliance Specialist', department: 'ADMINISTRATION_COMPLIANCE' },
  { key: 'RISK_INSURANCE_COORD', name: 'Risk / Insurance Coordinator', department: 'ADMINISTRATION_COMPLIANCE' },
  // Corporate / Shared Services
  { key: 'HR_MANAGER', name: 'HR Manager', department: 'CORPORATE_SHARED_SERVICES' },
  { key: 'RECRUITER', name: 'Recruiter', department: 'CORPORATE_SHARED_SERVICES' },
  { key: 'TRAINING_MANAGER', name: 'Training Manager', department: 'CORPORATE_SHARED_SERVICES' },
  { key: 'IT_SYSTEMS_ADMIN', name: 'IT / Systems Administrator', department: 'CORPORATE_SHARED_SERVICES' },
  { key: 'DATA_REPORTING_ANALYST', name: 'Data / Reporting Analyst', department: 'CORPORATE_SHARED_SERVICES' },
  // System-Level / Access Roles
  { key: 'SYSTEM_ADMIN', name: 'System Admin', department: 'SYSTEM_LEVEL' },
  { key: 'CORPORATE_ADMIN', name: 'Corporate Admin', department: 'SYSTEM_LEVEL' },
  { key: 'PROPERTY_LEVEL_ADMIN', name: 'Property-Level Admin', department: 'SYSTEM_LEVEL' },
  { key: 'MANAGER', name: 'Manager', department: 'SYSTEM_LEVEL' },
  { key: 'STAFF', name: 'Staff', department: 'SYSTEM_LEVEL' },
  { key: 'READONLY_AUDITOR', name: 'Read-Only / Auditor', department: 'SYSTEM_LEVEL' },
  { key: 'VENDOR', name: 'Vendor', department: 'SYSTEM_LEVEL' },
];

// Permission definitions
const PERMISSIONS = [
  // Administration
  { key: 'ADMIN_USERS_VIEW', name: 'View Users' },
  { key: 'ADMIN_USERS_CREATE', name: 'Create Users' },
  { key: 'ADMIN_USERS_UPDATE', name: 'Update Users' },
  { key: 'ADMIN_USERS_DELETE', name: 'Delete Users' },
  { key: 'ADMIN_ROLES_VIEW', name: 'View Roles' },
  { key: 'ADMIN_ROLES_UPDATE', name: 'Update Roles' },
  { key: 'ADMIN_SETTINGS_VIEW', name: 'View Settings' },
  { key: 'ADMIN_SETTINGS_UPDATE', name: 'Update Settings' },
  { key: 'ADMIN_AUDIT_LOG_VIEW', name: 'View Audit Logs' },
  // Properties
  { key: 'PROPERTIES_VIEW', name: 'View Properties' },
  { key: 'PROPERTIES_UPDATE', name: 'Update Properties' },
  // Apartments
  { key: 'APARTMENTS_VIEW', name: 'View Apartments' },
  { key: 'APARTMENTS_UPDATE', name: 'Update Apartments' },
  // Leasing
  { key: 'LEASING_VIEW', name: 'View Leasing' },
  { key: 'LEASING_CREATE', name: 'Create Leasing Records' },
  { key: 'LEASING_UPDATE', name: 'Update Leasing' },
  // Maintenance / Work Orders
  { key: 'WORKORDERS_VIEW', name: 'View Work Orders' },
  { key: 'WORKORDERS_CREATE', name: 'Create Work Orders' },
  { key: 'WORKORDERS_UPDATE', name: 'Update Work Orders' },
  // Make Ready
  { key: 'MAKEREADY_VIEW', name: 'View Make Ready' },
  { key: 'MAKEREADY_CREATE', name: 'Create Make Ready' },
  { key: 'MAKEREADY_UPDATE', name: 'Update Make Ready' },
  // Vendors
  { key: 'VENDORS_VIEW', name: 'View Vendors' },
  { key: 'VENDORS_UPDATE', name: 'Update Vendors' },
  // Accounting / Payable
  { key: 'AP_BILLS_VIEW', name: 'View Bills' },
  { key: 'AP_BILLS_CREATE', name: 'Create Bills' },
  { key: 'AP_BILLS_APPROVE', name: 'Approve Bills' },
  { key: 'AP_PAYMENTS_INITIATE', name: 'Initiate Payments' },
  // Reports
  { key: 'REPORTS_VIEW', name: 'View Reports' },
  { key: 'REPORTS_EXPORT', name: 'Export Reports' },
];

// Role-to-Permission mappings
const ROLE_PERMISSIONS: { [roleKey: string]: string[] } = {
  SYSTEM_ADMIN: [
    // System Admin gets all permissions
    'ADMIN_USERS_VIEW', 'ADMIN_USERS_CREATE', 'ADMIN_USERS_UPDATE', 'ADMIN_USERS_DELETE',
    'ADMIN_ROLES_VIEW', 'ADMIN_ROLES_UPDATE', 'ADMIN_SETTINGS_VIEW', 'ADMIN_SETTINGS_UPDATE',
    'ADMIN_AUDIT_LOG_VIEW', 'PROPERTIES_VIEW', 'PROPERTIES_UPDATE', 'APARTMENTS_VIEW',
    'APARTMENTS_UPDATE', 'LEASING_VIEW', 'LEASING_CREATE', 'LEASING_UPDATE', 'WORKORDERS_VIEW',
    'WORKORDERS_CREATE', 'WORKORDERS_UPDATE', 'MAKEREADY_VIEW', 'MAKEREADY_CREATE',
    'MAKEREADY_UPDATE', 'VENDORS_VIEW', 'VENDORS_UPDATE', 'AP_BILLS_VIEW', 'AP_BILLS_CREATE',
    'AP_BILLS_APPROVE', 'AP_PAYMENTS_INITIATE', 'REPORTS_VIEW', 'REPORTS_EXPORT',
  ],
  CORPORATE_ADMIN: [
    'ADMIN_USERS_VIEW', 'ADMIN_USERS_CREATE', 'ADMIN_USERS_UPDATE',
    'ADMIN_ROLES_VIEW', 'ADMIN_SETTINGS_VIEW', 'ADMIN_AUDIT_LOG_VIEW', 'PROPERTIES_VIEW',
    'REPORTS_VIEW', 'REPORTS_EXPORT',
  ],
  PROPERTY_LEVEL_ADMIN: [
    'ADMIN_USERS_VIEW', 'PROPERTIES_VIEW', 'APARTMENTS_VIEW', 'APARTMENTS_UPDATE',
    'LEASING_VIEW', 'LEASING_CREATE', 'LEASING_UPDATE', 'WORKORDERS_VIEW', 'WORKORDERS_CREATE',
    'WORKORDERS_UPDATE', 'MAKEREADY_VIEW', 'MAKEREADY_CREATE', 'MAKEREADY_UPDATE',
    'VENDORS_VIEW', 'REPORTS_VIEW',
  ],
  PROPERTY_MANAGER: [
    'PROPERTIES_VIEW', 'APARTMENTS_VIEW', 'APARTMENTS_UPDATE', 'LEASING_VIEW',
    'LEASING_CREATE', 'LEASING_UPDATE', 'WORKORDERS_VIEW', 'WORKORDERS_CREATE',
    'WORKORDERS_UPDATE', 'MAKEREADY_VIEW', 'VENDORS_VIEW', 'REPORTS_VIEW',
  ],
  MAINTENANCE_SUPERVISOR: [
    'WORKORDERS_VIEW', 'WORKORDERS_CREATE', 'WORKORDERS_UPDATE', 'MAKEREADY_VIEW',
    'MAKEREADY_CREATE', 'MAKEREADY_UPDATE', 'APARTMENTS_VIEW',
  ],
  MAINTENANCE_TECH: [
    'WORKORDERS_VIEW', 'WORKORDERS_UPDATE', 'MAKEREADY_VIEW', 'MAKEREADY_UPDATE',
  ],
  MAKE_READY_TECH: [
    'MAKEREADY_VIEW', 'MAKEREADY_UPDATE', 'APARTMENTS_VIEW',
  ],
  LEASING_MANAGER: [
    'LEASING_VIEW', 'LEASING_CREATE', 'LEASING_UPDATE', 'APARTMENTS_VIEW', 'PROPERTIES_VIEW',
  ],
  LEASING_AGENT: [
    'LEASING_VIEW', 'LEASING_CREATE', 'LEASING_UPDATE', 'APARTMENTS_VIEW',
  ],
  ACCOUNTING_MANAGER: [
    'AP_BILLS_VIEW', 'AP_BILLS_CREATE', 'AP_BILLS_APPROVE', 'AP_PAYMENTS_INITIATE',
    'REPORTS_VIEW', 'REPORTS_EXPORT',
  ],
  READONLY_AUDITOR: [
    'ADMIN_AUDIT_LOG_VIEW', 'PROPERTIES_VIEW', 'APARTMENTS_VIEW', 'LEASING_VIEW',
    'WORKORDERS_VIEW', 'MAKEREADY_VIEW', 'VENDORS_VIEW', 'REPORTS_VIEW',
  ],
  VENDOR: [
    'WORKORDERS_VIEW', 'MAKEREADY_VIEW', 'VENDORS_VIEW',
  ],
  STAFF: [
    'APARTMENTS_VIEW', 'WORKORDERS_VIEW', 'MAKEREADY_VIEW',
  ],
  MANAGER: [
    'PROPERTIES_VIEW', 'APARTMENTS_VIEW', 'WORKORDERS_VIEW', 'WORKORDERS_UPDATE',
    'MAKEREADY_VIEW', 'MAKEREADY_UPDATE', 'REPORTS_VIEW',
  ],
};

async function main() {
  // Create Property first
  const property = await prisma.property.upsert({
    where: { code: 'WATERFORD_LANDINGS' },
    update: {},
    create: {
      name: 'Waterford Landings',
      code: 'WATERFORD_LANDINGS',
      address1: '123 Waterford Landings Dr',
      city: 'Clarksville',
      state: 'TN',
      postalCode: '37040',
    },
  });

  console.log(`Property created/updated: ${property.name}`);

  // Create Departments
  const departments: { [key: string]: any } = {};
  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.upsert({
      where: { key: dept.key },
      update: {},
      create: {
        key: dept.key,
        name: dept.name,
      },
    });
    departments[dept.key] = created;
  }
  console.log(`Created ${DEPARTMENTS.length} departments`);

  // Create Roles
  const roles: { [key: string]: any } = {};
  for (const role of ROLES) {
    const deptId = departments[role.department].id;
    const created = await prisma.role.upsert({
      where: { key: role.key },
      update: {},
      create: {
        key: role.key,
        name: role.name,
        departmentId: deptId,
      },
    });
    roles[role.key] = created;
  }
  console.log(`Created ${ROLES.length} roles`);

  // Create Permissions
  const permissions: { [key: string]: any } = {};
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: {
        key: perm.key,
        name: perm.name,
      },
    });
    permissions[perm.key] = created;
  }
  console.log(`Created ${PERMISSIONS.length} permissions`);

  // Create RolePermission mappings
  for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roles[roleKey];
    if (!role) continue;

    // Delete existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Create new permissions
    for (const permKey of permissionKeys) {
      const perm = permissions[permKey];
      if (!perm) continue;

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log(`Created role-permission mappings`);

  // Create admin user with System Admin role
  const adminEmail = 'mkwinfr@gmail.com';
  const adminPassword = 'Faker2029$';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: roles.SYSTEM_ADMIN.id,
      propertyId: property.id,
    },
    create: {
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      roleId: roles.SYSTEM_ADMIN.id,
      status: 'ACTIVE',
      propertyId: property.id,
      userRole: UserRole.SUPER_ADMIN, // legacy field
    },
  });

  console.log(`Admin user created: ${adminEmail}`);

  // Create a default service user
  const defaultUser = await prisma.user.upsert({
    where: { email: 'default@propertysuite.test' },
    update: {
      roleId: roles.STAFF.id,
      propertyId: property.id,
    },
    create: {
      name: 'System User',
      email: 'default@propertysuite.test',
      password: await bcrypt.hash('TempPassword123!', 10),
      roleId: roles.STAFF.id,
      status: 'ACTIVE',
      propertyId: property.id,
      userRole: UserRole.MAINTENANCE_TEAM, // legacy field
    },
  });

  // Assign admin to property
  await prisma.userProperty.upsert({
    where: {
      userId_propertyId: {
        userId: adminUser.id,
        propertyId: property.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      propertyId: property.id,
    },
  });

  console.log(`Admin assigned to property: ${property.name}`);

  // Clear existing data in order - only if tables exist
  try {
    await prisma.turnTask.deleteMany({
      where: { turn: { apartment: { propertyId: property.id } } },
    });
  } catch (e) {
    // Table may not exist yet
  }

  try {
    await prisma.turn.deleteMany({
      where: { apartment: { propertyId: property.id } },
    });
  } catch (e) {
    // Table may not exist yet
  }

  try {
    await prisma.apartment.deleteMany({
      where: { propertyId: property.id },
    });
  } catch (e) {
    // Table may not exist yet
  }

  try {
    await prisma.building.deleteMany({
      where: { propertyId: property.id },
    });
  } catch (e) {
    // Table may not exist yet
  }

  // Create buildings (100-1700)
  const buildings24 = [100, 200, 300, 400, 500, 1200, 1300, 1400, 1500, 1600, 1700];
  const buildings20 = [600, 700, 800, 900, 1000, 1100];

  const buildingMap: Record<number, { id: number }> = {};

  for (const buildingNumber of [...buildings24, ...buildings20]) {
    const building = await prisma.building.create({
      data: {
        propertyId: property.id,
        buildingNumber: buildingNumber.toString(),
        name: `Building ${buildingNumber}`,
      },
    });
    buildingMap[buildingNumber] = building;
  }

  type ApartmentSeed = {
    propertyId: number;
    buildingId: number;
    unitNumber: string;
    building: string;
    floor: number | null;
    beds: number | null;
    baths: number | null;
    sqFt: number | null;
    status: OccupancyStatus;
    inlineNote: string | null;
  };

  const apartmentsToCreate: ApartmentSeed[] = [];

  function addUnitsForBuilding(buildingNumber: number, count: number) {
    const start = buildingNumber + 1;

    for (let i = 0; i < count; i++) {
      const unitNum = start + i;

      apartmentsToCreate.push({
        propertyId: property.id,
        buildingId: buildingMap[buildingNumber].id,
        unitNumber: unitNum.toString(),
        building: buildingNumber.toString(),
        floor: null,
        beds: 1,
        baths: 1,
        sqFt: null,
        status: OccupancyStatus.OCCUPIED,
        inlineNote: null,
      });
    }
  }

  for (const b of buildings24) {
    addUnitsForBuilding(b, 24);
  }

  for (const b of buildings20) {
    addUnitsForBuilding(b, 20);
  }

  await prisma.apartment.createMany({
    data: apartmentsToCreate,
  });

  // Helper to seed a turn and mark apartment occupancy based on move-out date
  async function seedTurnForUnit(params: {
    unitNumber: string;
    moveOutDate: string;
    targetReadyDate: string;
    priority: 'HIGH' | 'NORMAL';
    turnOwnerId: string;
    notes: string;
  }) {
    const apartment = await prisma.apartment.findFirst({
      where: { propertyId: property.id, unitNumber: params.unitNumber },
    });

    if (!apartment) {
      console.warn(`Apartment ${params.unitNumber} not found, skipping turn seed.`);
      return;
    }

    const moveOut = new Date(params.moveOutDate);
    const targetReady = new Date(params.targetReadyDate);
    const now = new Date();
    const nextStatus =
      moveOut <= now ? OccupancyStatus.VACANT : OccupancyStatus.NOTICE;

    await prisma.apartment.update({
      where: { id: apartment.id },
      data: { status: nextStatus },
    });

    await prisma.turn.create({
      data: {
        apartmentId: apartment.id,
        createdByUserId: defaultUser.id,
        type: 'STANDARD_MOVE_OUT',
        status: 'IN_PROGRESS',
        priority: params.priority,
        moveOutDate: moveOut,
        targetReadyDate: targetReady,
        turnOwnerId: params.turnOwnerId,
        turnNotes: params.notes,
        tasks: {
          create: [
            {
              title: 'Inspect unit',
              category: 'GENERAL_MAINTENANCE',
              status: 'IN_PROGRESS',
              sortOrder: 0,
            },
            {
              title: 'Schedule cleaning',
              category: 'CLEANING',
              status: 'PENDING',
              sortOrder: 1,
            },
          ],
        },
        workCategories: {
          create: [{ category: 'CLEANING' }, { category: 'GENERAL_MAINTENANCE' }],
        },
        conditionTags: {
          create: [{ tag: 'HEAVY_TRASH' }],
        },
      },
    });
  }

  // Seed floor plans
  await seedFloorPlans();
// Seed Waterford apartments from CSV
  await seedWaterfordApartments();

  
  console.log('Seeding complete - Created 17 buildings, 384 apartments, and sample turns');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
