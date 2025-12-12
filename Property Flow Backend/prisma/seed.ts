// prisma/seed.ts
import { PrismaClient, OccupancyStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure a default user exists for createdByUserId references
  const defaultUser = await prisma.user.upsert({
    where: { email: 'default@propertysuite.test' },
    update: {},
    create: {
      name: 'Default User',
      email: 'default@propertysuite.test',
      role: 'admin',
    },
  });

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

  await prisma.apartment.deleteMany({
    where: { propertyId: property.id },
  });

  const buildings24 = [100, 200, 300, 400, 500, 1200, 1300, 1400, 1500, 1600, 1700];
  const buildings20 = [600, 700, 800, 900, 1000, 1100];

  type ApartmentSeed = {
    propertyId: number;
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

  // Clear existing turn-related data to avoid FK issues before reseeding
  await prisma.turnMaterial.deleteMany();
  await prisma.turnConditionTag.deleteMany();
  await prisma.turnWorkCategory.deleteMany();
  await prisma.turnTask.deleteMany();
  await prisma.turn.deleteMany();

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

  // Sample turns: one already vacant, one pending
  await seedTurnForUnit({
    unitNumber: '101',
    moveOutDate: '2025-11-13',
    targetReadyDate: '2025-11-20',
    priority: 'HIGH',
    turnOwnerId: 'Alex Tech',
    notes: 'Quick turn with paint touch-ups.',
  });

  await seedTurnForUnit({
    unitNumber: '205',
    moveOutDate: '2026-01-12',
    targetReadyDate: '2026-01-20',
    priority: 'NORMAL',
    turnOwnerId: 'Jamie Tech',
    notes: 'Resident transferring; schedule carpet clean.',
  });

  console.log("Seeding complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
