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

async function search(query) {
  const url = `https://${API_HOST}/teams?name=${encodeURIComponent(query)}`;
  console.log(`Searching for: "${query}"`);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await res.json();
  const results = data.response || [];
  console.log(` -> Found ${results.length} results:`);
  if (data.errors) console.log('Errors:', data.errors);
  results.forEach(r => console.log(`   * Name: "${r.team.name}" | ID: ${r.team.id} | National: ${r.team.national}`));
}

async function main() {
  await search('Bosnia');
  await search('Cape');
  await search('Cabo');
  await search('Turkey');
  await search('Turk');
}

main().catch(console.error);
