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

// Naming translation map for API-Football search
const NAME_TRANSLATION = {
  "Bosnia & Herzegovina": "Bosnia-Herzegovina",
  "Cape Verde": "Cabo Verde",
  "DR Congo": "Congo DR"
};

const ALL_48_TEAMS = [
  'Algeria',        'Argentina',   'Australia',
  'Austria',        'Belgium',     'Bosnia & Herzegovina',
  'Brazil',         'Canada',      'Cape Verde',
  'Colombia',       'Croatia',     'Curaçao',
  'Czech Republic', 'DR Congo',    'Ecuador',
  'Egypt',          'England',     'France',
  'Germany',        'Ghana',       'Haiti',
  'Iran',           'Iraq',        'Ivory Coast',
  'Japan',          'Jordan',      'Mexico',
  'Morocco',        'Netherlands', 'New Zealand',
  'Norway',         'Panama',      'Paraguay',
  'Portugal',       'Qatar',       'Saudi Arabia',
  'Scotland',       'Senegal',     'South Africa',
  'South Korea',    'Spain',       'Sweden',
  'Switzerland',    'Tunisia',     'Turkey',
  'USA',            'Uruguay',     'Uzbekistan'
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchTeam(name) {
  const searchTerm = NAME_TRANSLATION[name] || name;
  const url = `https://${API_HOST}/teams?name=${encodeURIComponent(searchTerm)}`;
  
  console.log(`Searching API for: ${searchTerm}...`);
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  
  const data = await res.json();
  const results = data.response || [];
  
  // Find national team first
  const national = results.find(item => item.team.national === true);
  if (national) return national.team;
  
  // Fallback to first result
  if (results[0]) return results[0].team;
  return null;
}

async function main() {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not set.');
  
  const mappingPath = path.join(__dirname, 'teams-mapping.json');
  let currentMapping = {};
  if (fs.existsSync(mappingPath)) {
    currentMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  }
  
  const teamsToResolve = ALL_48_TEAMS.filter(name => !currentMapping[name]);
  console.log(`Already mapped teams: ${Object.keys(currentMapping).length}`);
  console.log(`Remaining teams to resolve: ${teamsToResolve.length} (${teamsToResolve.join(', ')})`);
  
  for (let i = 0; i < teamsToResolve.length; i++) {
    const name = teamsToResolve[i];
    try {
      const team = await searchTeam(name);
      if (team) {
        console.log(` -> Resolved ${name} to ID: ${team.id}, flag: ${team.logo}`);
        currentMapping[name] = {
          apiId: team.id,
          flagUrl: team.logo
        };
        // Save mapping file progressively so we don't lose progress if it fails
        fs.writeFileSync(mappingPath, JSON.stringify(currentMapping, null, 2));
      } else {
        console.error(` -> Could not resolve team: ${name}`);
      }
    } catch (e) {
      console.error(` -> Error resolving ${name}: ${e.message}`);
    }
    
    // Pause for 6.5 seconds to strictly comply with 10 reqs/min rate limit
    if (i < teamsToResolve.length - 1) {
      await delay(6500);
    }
  }
  
  console.log(`\nMapping completed and saved to ${mappingPath}`);
  console.log(`Total mapped teams: ${Object.keys(currentMapping).length}`);
}

main().catch(console.error);
