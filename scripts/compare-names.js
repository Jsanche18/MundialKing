const fs = require('fs');
const path = require('path');

async function main() {
  const mappingPath = path.join(__dirname, 'teams-mapping.json');
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(url);
  const data = await res.json();
  
  const openfootballTeams = new Set();
  data.matches.forEach(m => {
    openfootballTeams.add(m.team1);
    openfootballTeams.add(m.team2);
  });
  
  const placeholders = [];
  const realTeams = [];
  
  const isPlaceholder = name => {
    // Placeholders are 1A, 2B, W73, L101, 3A/B/C/D/F, etc.
    return /^\d[A-L]$/.test(name) || 
           /^W\d+$/.test(name) || 
           /^L\d+$/.test(name) || 
           /^3[A-L/]+$/.test(name);
  };
  
  Array.from(openfootballTeams).forEach(name => {
    if (isPlaceholder(name)) {
      placeholders.push(name);
    } else {
      realTeams.push(name);
    }
  });
  
  console.log(`Found ${realTeams.length} real team names in openfootball.`);
  console.log(`Found ${placeholders.length} placeholder names in openfootball.`);
  
  const unmapped = [];
  realTeams.forEach(name => {
    if (!mapping[name]) {
      unmapped.push(name);
    }
  });
  
  if (unmapped.length > 0) {
    console.log('UNMAPPED TEAMS:', unmapped);
  } else {
    console.log('All real teams in openfootball are successfully mapped!');
  }
}

main().catch(console.error);
