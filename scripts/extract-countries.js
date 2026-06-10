const fs = require('fs');

async function main() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  
  const data = await res.json();
  const rawTeams = new Set();
  data.matches.forEach(m => {
    rawTeams.add(m.team1);
    rawTeams.add(m.team2);
  });
  
  const countries = Array.from(rawTeams).filter(name => {
    // Filter out placeholders like 1A, 2B, W73, L74, 3A/B/C/D/F
    if (/^\d+[A-L]$/.test(name)) return false; // 1A, 2B
    if (/^[WL]\d+$/.test(name)) return false; // W73, L74
    if (name.includes('/')) return false; // 3A/B/C/D/F
    return true;
  });

  console.log(`Found ${countries.length} real countries:`);
  console.log(countries.sort());
}

main().catch(console.error);
