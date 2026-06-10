const fs = require('fs');
const path = require('path');

async function main() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(url);
  const data = await res.json();
  const matches = data.matches || [];
  
  // Let's print the first 10 matches to see if they have group/round info
  for (let i = 0; i < 15; i++) {
    const m = matches[i];
    console.log(`Match ${i+1}: Round: "${m.round}" | ${m.team1} vs ${m.team2} | Date: ${m.date}`);
  }
  
  // Let's check how many unique rounds there are in the first 72 matches
  const rounds = new Set();
  for (let i = 0; i < 72; i++) {
    rounds.add(matches[i].round);
  }
  console.log('Rounds in group stage:', Array.from(rounds));
}

main().catch(console.error);
