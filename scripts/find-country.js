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
  const url = `https://${API_HOST}/countries`;
  console.log(`Calling countries API...`);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await res.json();
  const countries = data.response || [];
  console.log(`Total countries in API: ${countries.length}`);
  const matches = countries.filter(c => 
    c.name.toLowerCase().includes('verde') || 
    c.name.toLowerCase().includes('cabo') || 
    c.name.toLowerCase().includes('cape')
  );
  console.log('Matches:', matches);
}

main().catch(console.error);
