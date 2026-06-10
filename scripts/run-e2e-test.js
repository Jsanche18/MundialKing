const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanDatabase() {
  console.log('Cleaning up test users and groups...');
  // Delete predictions first to prevent foreign key errors
  await prisma.prediction.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.user.deleteMany({});
  
  // Reset match 1003 status to "NS" so the cron can process it
  await prisma.match.update({
    where: { apiId: 1003 },
    data: { status: 'NS', homeGoals: null, awayGoals: null }
  });
  console.log('Database cleaned.');
}

async function runTest() {
  await cleanDatabase();

  // 1. Register User 1
  console.log('\n--- 1. Register User 1 ---');
  const reg1Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user1@example.com',
      name: 'User One',
      password: 'Password123!'
    })
  });
  const reg1 = await reg1Res.json();
  console.log('User 1 Register Response:', reg1);
  if (!reg1Res.ok) throw new Error('User 1 registration failed');

  // 2. Register User 2
  console.log('\n--- 2. Register User 2 ---');
  const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user2@example.com',
      name: 'User Two',
      password: 'Password123!'
    })
  });
  const reg2 = await reg2Res.json();
  console.log('User 2 Register Response:', reg2);
  if (!reg2Res.ok) throw new Error('User 2 registration failed');

  // Get user IDs from DB
  const user1 = await prisma.user.findUnique({ where: { email: 'user1@example.com' } });
  const user2 = await prisma.user.findUnique({ where: { email: 'user2@example.com' } });
  console.log(`User IDs: User1=${user1.id}, User2=${user2.id}`);

  // 3. User 1 Creates Group
  console.log('\n--- 3. User 1 Creates Group ---');
  const createGroupRes = await fetch(`${BASE_URL}/api/groups/create`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-Id': user1.id
    },
    body: JSON.stringify({
      name: 'Mundial Champions Group',
      password: 'groupPassword123'
    })
  });
  const groupData = await createGroupRes.json();
  console.log('Group Creation Response:', groupData);
  if (!createGroupRes.ok) throw new Error('Group creation failed');

  const groupId = groupData.group.id;
  const inviteCode = groupData.group.inviteCode;
  console.log(`Group ID: ${groupId}, Invite Code: ${inviteCode}`);

  // 4. User 2 Joins Group
  console.log('\n--- 4. User 2 Joins Group ---');
  const joinGroupRes = await fetch(`${BASE_URL}/api/groups/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user2.id
    },
    body: JSON.stringify({
      inviteCode,
      password: 'groupPassword123'
    })
  });
  const joinData = await joinGroupRes.json();
  console.log('Group Join Response:', joinData);
  if (!joinGroupRes.ok) throw new Error('Group join failed');

  // 5. Submit Predictions
  console.log('\n--- 5. Submit Predictions for Match 1003 (Canada vs Bosnia) ---');
  // User 1 predicts 2-1
  const pred1Res = await fetch(`${BASE_URL}/api/predictions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user1.id
    },
    body: JSON.stringify({
      matchId: 1003,
      groupId,
      homeGoals: 2,
      awayGoals: 1
    })
  });
  console.log('User 1 Prediction PUT status:', pred1Res.status);
  const pred1Data = await pred1Res.json();
  console.log('User 1 Prediction Response:', pred1Data);

  // User 2 predicts 1-1
  const pred2Res = await fetch(`${BASE_URL}/api/predictions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user2.id
    },
    body: JSON.stringify({
      matchId: 1003,
      groupId,
      homeGoals: 1,
      awayGoals: 1
    })
  });
  console.log('User 2 Prediction PUT status:', pred2Res.status);
  const pred2Data = await pred2Res.json();
  console.log('User 2 Prediction Response:', pred2Data);

  // 6. Draft Exclusivity Testing
  console.log('\n--- 6. Draft Selections ---');
  // User 1 drafts Team 5 (Canadá)
  const draftTeam1Res = await fetch(`${BASE_URL}/api/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': user1.id },
    body: JSON.stringify({ type: 'team', id: 5, groupId })
  });
  console.log('User 1 draft team 5 (Canadá) response:', await draftTeam1Res.json());

  // User 2 tries to draft Team 5 (Canadá) -> should conflict!
  const draftTeam2ConflictRes = await fetch(`${BASE_URL}/api/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': user2.id },
    body: JSON.stringify({ type: 'team', id: 5, groupId })
  });
  console.log('User 2 draft team 5 (Conflict test) status:', draftTeam2ConflictRes.status);
  console.log('User 2 draft team 5 (Conflict test) response:', await draftTeam2ConflictRes.json());
  if (draftTeam2ConflictRes.status !== 409) {
    throw new Error('Team draft exclusivity constraint failed (should have returned 409)');
  }

  // User 2 drafts Team 11 (Brasil) -> should succeed
  const draftTeam2Res = await fetch(`${BASE_URL}/api/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': user2.id },
    body: JSON.stringify({ type: 'team', id: 11, groupId })
  });
  console.log('User 2 draft team 11 (Brasil) response:', await draftTeam2Res.json());

  // User 1 drafts Player 102 (Christian Pulisic)
  const draftPlayer1Res = await fetch(`${BASE_URL}/api/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': user1.id },
    body: JSON.stringify({ type: 'player', id: 102, groupId })
  });
  console.log('User 1 draft player 102 (Pulisic) response:', await draftPlayer1Res.json());

  // User 2 tries to draft Player 102 -> should conflict!
  const draftPlayer2ConflictRes = await fetch(`${BASE_URL}/api/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': user2.id },
    body: JSON.stringify({ type: 'player', id: 102, groupId })
  });
  console.log('User 2 draft player 102 (Conflict test) status:', draftPlayer2ConflictRes.status);
  console.log('User 2 draft player 102 (Conflict test) response:', await draftPlayer2ConflictRes.json());
  if (draftPlayer2ConflictRes.status !== 409) {
    throw new Error('Player draft exclusivity constraint failed (should have returned 409)');
  }

  // User 2 drafts Player 105 (Vinícius Júnior) -> should succeed
  const draftPlayer2Res = await fetch(`${BASE_URL}/api/draft/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': user2.id },
    body: JSON.stringify({ type: 'player', id: 105, groupId })
  });
  console.log('User 2 draft player 105 (Vinícius) response:', await draftPlayer2Res.json());

  // 7. Execute Simulated Live Sync Cron Job
  console.log('\n--- 7. Run Live Score Cron (Simulation Mode) ---');
  // Headers need CRON_SECRET authorization
  const cronRes = await fetch(`${BASE_URL}/api/cron/live`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer supersecretcronkey1234'
    }
  });
  console.log('Cron live run status:', cronRes.status);
  const cronData = await cronRes.json();
  console.log('Cron Response:', cronData);
  if (!cronRes.ok) throw new Error('Cron run failed');

  // 8. Verify final point calculation
  console.log('\n--- 8. Verifying Points in DB ---');
  const finalMembers = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: true }
  });

  console.log('\nFinal Standings:');
  finalMembers.forEach(m => {
    console.log(` - User: ${m.user.name} | Total Points: ${m.totalPoints} (Exact Matches: ${m.exactScores}, Tendencies: ${m.tendencies}, Draft Goals Points: ${m.draftGoalsPoints})`);
  });

  // User 1 expected: 4 points (3 from exact match prediction 2-1 + 1 from drafted player 102 scoring a goal)
  // User 2 expected: 0 points (0 from prediction 1-1 + 0 from drafted player 105)
  const m1 = finalMembers.find(m => m.userId === user1.id);
  const m2 = finalMembers.find(m => m.userId === user2.id);

  if (m1.totalPoints !== 4) {
    throw new Error(`User 1 points incorrect! Expected 4, got ${m1.totalPoints}`);
  }
  if (m2.totalPoints !== 0) {
    throw new Error(`User 2 points incorrect! Expected 0, got ${m2.totalPoints}`);
  }

  console.log('\n==================================');
  console.log('E2E TEST PASSED SUCCESSFULLY!');
  console.log('==================================');
}

runTest()
  .catch(e => {
    console.error('\nE2E TEST FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
