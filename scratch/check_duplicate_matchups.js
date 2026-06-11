const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: {
      apiId: 'asc',
    },
  });

  const groupStageMatches = matches.filter(m => m.apiId <= 2026072);
  const matchups = {};
  let duplicateCount = 0;

  groupStageMatches.forEach(m => {
    const teams = [m.homeTeam.name, m.awayTeam.name].sort().join(' vs ');
    if (matchups[teams]) {
      console.log(`Duplicate found! Match ${m.apiId} and Match ${matchups[teams].apiId}: ${teams}`);
      duplicateCount++;
    } else {
      matchups[teams] = m;
    }
  });

  console.log(`Total group stage matches: ${groupStageMatches.length}`);
  console.log(`Duplicate matchups: ${duplicateCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
