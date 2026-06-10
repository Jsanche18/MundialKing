const fs = require('fs');
const path = require('path');

async function main() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(url);
  const data = await res.json();
  const matches = data.matches || [];

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  for (let i = 0; i < 12; i++) {
    const groupName = groups[i];
    const groupMatches = matches.slice(i * 6, i * 6 + 6);
    const teams = new Set();
    groupMatches.forEach(m => {
      teams.add(m.team1);
      teams.add(m.team2);
    });
    console.log(`Group ${groupName}:`, Array.from(teams));
  }
}

main().catch(console.error);
