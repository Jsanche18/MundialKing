const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Goal Simulator Triggered!');
  const match = await prisma.match.findUnique({
    where: { apiId: 1003 }
  });

  if (!match) {
    throw new Error('Match 1003 not found in PostgreSQL DB!');
  }

  const currentHome = match.homeGoals !== null ? match.homeGoals : 0;
  const newHome = currentHome + 1;

  console.log(`Current Canada goals: ${currentHome}. Incrementing to: ${newHome}...`);

  await prisma.match.update({
    where: { apiId: 1003 },
    data: {
      homeGoals: newHome
    }
  });

  console.log(`✓ SUCCESS: Canada score updated to ${newHome} in PostgreSQL!`);
}

main()
  .catch(e => console.error('Error in Goal Simulator:', e))
  .finally(() => prisma.$disconnect());
