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

  const knockoutMatches = matches.filter(m => m.apiId >= 2026073);
  console.log(`Total knockout matches: ${knockoutMatches.length}`);
  
  knockoutMatches.forEach(m => {
    console.log(`Match ${m.apiId} | ${m.homeTeam.name} vs ${m.awayTeam.name} | Round: ${m.apiId >= 2026104 ? 'Final' : m.apiId === 2026103 ? 'Tercer Puesto' : m.apiId >= 2026101 ? 'Semifinal' : m.apiId >= 2026097 ? 'Cuartos' : m.apiId >= 2026089 ? 'Octavos' : 'Ronda de 32'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
