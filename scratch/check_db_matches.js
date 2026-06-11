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

  console.log(`Total matches in DB: ${matches.length}`);
  
  // Group matches by apiId range or look for duplicate pairings
  const groupA = matches.filter(m => m.apiId >= 2026001 && m.apiId <= 2026006);
  console.log('\n--- GROUP A MATCHES IN DB ---');
  groupA.forEach(m => {
    console.log(`ID: ${m.apiId} | ${m.homeTeam.name} vs ${m.awayTeam.name} | Status: ${m.status} | Score: ${m.homeGoals}-${m.awayGoals}`);
  });

  // Let's count how many matches each team has
  const teamMatchCounts = {};
  matches.forEach(m => {
    if (m.apiId <= 2026072) { // Group stage
      teamMatchCounts[m.homeTeam.name] = (teamMatchCounts[m.homeTeam.name] || 0) + 1;
      teamMatchCounts[m.awayTeam.name] = (teamMatchCounts[m.awayTeam.name] || 0) + 1;
    }
  });

  console.log('\n--- TEAM GROUP MATCH COUNTS (FIRST 10) ---');
  Object.entries(teamMatchCounts).slice(0, 10).forEach(([team, count]) => {
    console.log(`${team}: ${count} matches`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
