// prisma/seed.ts
import { PrismaClient, OccupancyStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
