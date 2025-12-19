const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTurns() {
  try {
    const turns = await prisma.turn.findMany();
    console.log(`Total Turn records: ${turns.length}`);
    
    if (turns.length > 0) {
      console.log('\nStatus values found:');
      const statusCounts = {};
      turns.forEach(turn => {
        const status = turn.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTurns();
