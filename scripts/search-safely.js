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

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function callAPI(endpoint, params) {
  const queryStr = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const url = `https://${API_HOST}/${endpoint}?${queryStr}`;
  console.log(`Calling: ${url}`);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  console.log(`Status: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.log('Errors:', data.errors);
  }
  const results = data.response || [];
  console.log(` -> Found ${results.length} results.`);
  results.forEach(r => {
    if (r.team && r.team.national) {
      console.log(`   * [NATIONAL] Name: "${r.team.name}" | ID: ${r.team.id} | logo: ${r.team.logo} | Country: ${r.team.country}`);
    }
  });
}

async function main() {
  console.log('Starting safe searches with 10s intervals...');
  await callAPI('teams', { name: 'Turkey' });
  await delay(10000);
  await callAPI('teams', { name: 'Türkiye' });
  await delay(10000);
  await callAPI('teams', { name: 'Cape Verde' });
  await delay(10000);
  await callAPI('teams', { name: 'Cabo Verde' });
  await delay(10000);
  await callAPI('teams', { country: 'Turkey' });
  await delay(10000);
  await callAPI('teams', { country: 'Cape Verde' });
}

main().catch(console.error);
