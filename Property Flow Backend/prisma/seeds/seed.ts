// DEPRECATED: This file has been moved to /prisma/seed.ts
// 
// This folder structure is no longer used.
// All seed logic is now in: ../seed.ts
//
// To seed the database, run:
// npm run prisma:seed

async function main() {
  // Create or reuse the Waterford Landings property
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

  console.log(`Using property id=${property.id} (${property.name})`);

  // Dev-friendly: clear any existing apartments for this property
  await prisma.apartment.deleteMany({
    where: { propertyId: property.id },
  });

  // Buildings with 24 apartments each
  const buildings24 = [100, 200, 300, 400, 500, 1200, 1300, 1400, 1500, 1600, 1700];

  // Buildings with 20 apartments each
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

  // Helper to add units for a building
  function addUnitsForBuilding(
    buildingNumber: number,
    count: number,
  ) {
    const start = buildingNumber + 1; // e.g. 600 -> 601, 200 -> 201

    for (let i = 0; i < count; i++) {
      const unitNum = start + i;

      apartmentsToCreate.push({
        propertyId: property.id,
        unitNumber: unitNum.toString(),
        building: buildingNumber.toString(),
        floor: null,          // can set later (1,2,3)
        beds: 1,              // placeholder, can update later
        baths: 1,             // placeholder, can update later
        sqFt: null,
        status: OccupancyStatus.OCCUPIED,
        inlineNote: null,
      });
    }
  }

  // 24-unit buildings: 201, 301, 401, etc (building + 1)
  for (const b of buildings24) {
    addUnitsForBuilding(b, 24);
  }

  // 20-unit buildings: 601, 701, 801, etc (building + 1)
  for (const b of buildings20) {
    addUnitsForBuilding(b, 20);
  }

  console.log(`Seeding ${apartmentsToCreate.length} apartments for Waterford Landings...`);

  await prisma.apartment.createMany({
    data: apartmentsToCreate,
  });

  console.log('Seeding complete ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
