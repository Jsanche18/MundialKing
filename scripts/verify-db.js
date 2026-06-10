const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const groups = await prisma.group.findMany({ include: { members: true } });
  const teams = await prisma.team.findMany();
  const players = await prisma.player.findMany();
  const matches = await prisma.match.findMany();

  console.log('=== DATABASE STATUS ===');
  console.log(`Users: ${users.length}`);
  users.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}`));
  
  console.log(`Groups: ${groups.length}`);
  groups.forEach(g => {
    console.log(` - Group: ${g.name} (Code: ${g.inviteCode})`);
    g.members.forEach(m => console.log(`   * Member: ${m.userId}, Team: ${m.selectedTeamId}, Player: ${m.selectedPlayerId}, Points: ${m.totalPoints}`));
  });

  console.log(`Teams: ${teams.length}`);
  console.log(`Players: ${players.length}`);
  console.log(`Matches: ${matches.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
