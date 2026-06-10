const fs = require('fs');
const path = require('path');

async function main() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(url);
  const data = await res.json();
  
  const matches = data.matches || [];
  console.log(`Total Matches: ${matches.length}`);
  
  const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'teams-mapping.json'), 'utf8'));
  
  const knockoutMatches = matches.filter(m => !mapping[m.team1] || !mapping[m.team2]);
  
  knockoutMatches.forEach((m, idx) => {
    console.log(`Match ${idx + 73}: Round: "${m.round}" | ${m.team1} vs ${m.team2}`);
  });
}

main().catch(console.error);
