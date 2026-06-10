const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('=== STARTING SMART CRON TEST ===');

  // Reset match 1003 to NS in database so it can be resolved by the simulation
  console.log('Resetting match 1003 status to NS in DB...');
  await prisma.match.update({
    where: { apiId: 1003 },
    data: { status: 'NS', homeGoals: null, awayGoals: null }
  });

  // Test 1: Ordinary run with no active matches in play (Quota Protection Check)
  console.log('\n--- Test 1: Quota Protection Check (Ordinary Run) ---');
  const res1 = await fetch(`${BASE_URL}/api/cron/live`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer supersecretcronkey1234'
    }
  });

  if (!res1.ok) {
    throw new Error(`Cron returned error status: ${res1.status}`);
  }

  const data1 = await res1.json();
  console.log('Response:', data1);

  if (data1.activeMatches === 0 && data1.fetchedExternal === false) {
    console.log('✓ SUCCESS: Quota protected! No active matches found in DB, zero external calls made.');
  } else {
    throw new Error(`Quota protection failed! activeMatches=${data1.activeMatches}, fetchedExternal=${data1.fetchedExternal}`);
  }

  // Test 2: Simulation run (forcing a test match resolution and point calculations)
  console.log('\n--- Test 2: Simulation Mode Check (Force Match 1003 Resolution) ---');
  const res2 = await fetch(`${BASE_URL}/api/cron/live?simulate=true`, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer supersecretcronkey1234'
    }
  });

  if (!res2.ok) {
    throw new Error(`Cron simulation returned error status: ${res2.status}`);
  }

  const data2 = await res2.json();
  console.log('Response:', data2);

  if (data2.simulation === true && data2.message.includes('Smart Cron ejecutado correctamente')) {
    console.log('✓ SUCCESS: Simulation executed successfully, points calculated.');
  } else {
    throw new Error(`Simulation failed! simulation=${data2.simulation}, message=${data2.message}`);
  }

  console.log('\n==================================');
  console.log('SMART CRON VERIFICATION SUCCESSFUL!');
  console.log('==================================');
}

runTest()
  .catch(e => {
    console.error('\nTest failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
