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
  console.log(`Using API_KEY: ${API_KEY}`);
  const url = `https://${API_HOST}/teams?league=1&season=2022`;
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY || ''
    }
  });

  console.log(`Status: ${response.status} ${response.statusText}`);
  const json = await response.json();
  console.log('JSON Response:', JSON.stringify(json, null, 2));
}

main().catch(console.error);
