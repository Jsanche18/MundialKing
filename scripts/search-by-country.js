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

async function search(endpoint, params) {
  const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `https://${API_HOST}/${endpoint}?${queryStr}`;
  console.log(`Calling URL: ${url}`);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await res.json();
  const results = data.response || [];
  console.log(` -> Found ${results.length} results.`);
  results.forEach(r => {
    if (r.team) {
      console.log(`   * Team Name: "${r.team.name}" | ID: ${r.team.id} | National: ${r.team.national} | Country: ${r.team.country}`);
    } else {
      console.log(`   * Result:`, r);
    }
  });
}

async function main() {
  // Let's search by country for Cape Verde and Turkey variations
  console.log('--- COUNTRY SEARCHES ---');
  await search('teams', { country: 'Cape Verde' });
  await search('teams', { country: 'Cabo Verde' });
  await search('teams', { country: 'Turkey' });
  await search('teams', { country: 'Türkiye' });
  
  console.log('--- NAME SEARCHES ---');
  await search('teams', { name: 'Turkey' });
  await search('teams', { name: 'Türkiye' });
  await search('teams', { name: 'Cape Verde' });
  await search('teams', { name: 'Cabo Verde' });
  await search('teams', { name: 'Verde' });
}

main().catch(console.error);
