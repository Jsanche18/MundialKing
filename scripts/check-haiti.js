const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
  }
}

loadEnv();

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_HOST = 'v3.football.api-sports.io';

async function main() {
  const headers = { 'x-apisports-key': API_KEY };
  
  // 1. Check Haiti team details
  const teamUrl = `https://${API_HOST}/teams?id=2386`;
  console.log(`Checking Haiti Team details...`);
  const teamRes = await fetch(teamUrl, { headers });
  const teamData = await teamRes.json();
  console.log('Haiti Team Data:', JSON.stringify(teamData, null, 2));

  // 2. Check squad for Haiti
  const squadUrl = `https://${API_HOST}/players/squads?team=2386`;
  console.log(`\nChecking Haiti Squad details...`);
  const squadRes = await fetch(squadUrl, { headers });
  const squadData = await squadRes.json();
  console.log('Haiti Squad Data:', JSON.stringify(squadData, null, 2));
}

main().catch(console.error);
