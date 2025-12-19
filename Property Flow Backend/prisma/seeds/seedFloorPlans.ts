import { PrismaClient } from '@prisma/client';
import floorPlansData from './floorPlans.json';

const prisma = new PrismaClient();

export async function seedFloorPlans() {
  console.log('🏢 Seeding floor plans...');

  for (const floorPlan of floorPlansData) {
    await prisma.floorPlan.upsert({
      where: { name: floorPlan.name },
      update: {
        type: floorPlan.type,
        bedrooms: floorPlan.bedrooms,
        bathrooms: floorPlan.bathrooms,
        marketRent: floorPlan.marketRent,
        requiredDeposit: floorPlan.requiredDeposit,
        sqFt: floorPlan.sqFt,
        maxOccupancy: floorPlan.maxOccupancy,
      },
      create: floorPlan,
    });
  }

  console.log(`✅ Seeded ${floorPlansData.length} floor plans`);
}

// Run if called directly
if (require.main === module) {
  seedFloorPlans()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
