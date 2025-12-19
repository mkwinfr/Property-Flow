import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verifying apartment data...\n');

  // Check total apartments
  const totalApartments = await prisma.apartment.count();
  console.log(`Total apartments: ${totalApartments}`);

  // Check apartments with floor plans
  const withFloorPlan = await prisma.apartment.count({
    where: { floorPlanId: { not: null } }
  });
  console.log(`Apartments with floor plan: ${withFloorPlan}`);

  // Check apartments with rent data
  const withRent = await prisma.apartment.count({
    where: { 
      AND: [
        { minRent: { not: null } },
        { minRent: { gt: 0 } }
      ]
    }
  });
  console.log(`Apartments with rent data: ${withRent}`);

  // Sample a few apartments
  console.log('\n📋 Sample apartments:\n');
  const samples = await prisma.apartment.findMany({
    take: 5,
    include: {
      floorPlan: true
    },
    orderBy: { id: 'asc' }
  });

  samples.forEach(apt => {
    console.log(`Unit ${apt.unitNumber}:`);
    console.log(`  Floor Plan: ${apt.floorPlan?.name ?? 'MISSING'}`);
    console.log(`  Rent: $${apt.minRent ?? 'MISSING'} - $${apt.maxRent ?? 'MISSING'}`);
    console.log(`  Property: ${apt.property ?? 'MISSING'}`);
    console.log('');
  });

  // Check floor plans
  const totalFloorPlans = await prisma.floorPlan.count();
  console.log(`Total floor plans: ${totalFloorPlans}`);

  await prisma.$disconnect();
}

verifyData().catch(console.error);
