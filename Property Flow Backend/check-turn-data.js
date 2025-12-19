const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const turns = await prisma.turn.findMany({
      include: {
        apartment: {
          include: {
            floorPlan: true,
          },
        },
        punchListItems: true,
      },
    });

    console.log('=== TURNS WITH APARTMENT DATA ===\n');
    turns.forEach((turn) => {
      console.log(`Turn ID: ${turn.id}`);
      console.log(`  Unit: ${turn.apartment?.unitNumber}`);
      console.log(`  Floor Plan: ${turn.apartment?.floorPlan?.name || 'N/A'} (${turn.apartment?.floorPlan?.type || 'N/A'})`);
      console.log(`  Beds: ${turn.apartment?.beds || turn.apartment?.floorPlan?.bedrooms || 'N/A'}`);
      console.log(`  Baths: ${turn.apartment?.baths || turn.apartment?.floorPlan?.bathrooms || 'N/A'}`);
      console.log(`  Punch List Items: ${turn.punchListItems.length}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
