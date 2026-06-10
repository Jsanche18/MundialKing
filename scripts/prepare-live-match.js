const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Setting match 1003 status to LIVE and score to 1-1...');
  await prisma.match.update({
    where: { apiId: 1003 },
    data: {
      status: 'LIVE',
      homeGoals: 1,
      awayGoals: 1
    }
  });
  console.log('Match 1003 is now LIVE in PostgreSQL.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
