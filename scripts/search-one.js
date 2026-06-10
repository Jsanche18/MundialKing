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
  const url = `https://${API_HOST}/teams?name=Turkey`;
  console.log(`Calling: ${url}`);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  console.log(`Status: ${res.status} ${res.statusText}`);
  console.log('Headers:', [...res.headers.entries()]);
  const data = await res.json();
  console.log('Body:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
