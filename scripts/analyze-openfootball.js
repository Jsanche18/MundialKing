async function main() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  
  const data = await res.json();
  console.log(`Tournament Name: ${data.name}`);
  console.log(`Total Matches: ${data.matches.length}`);
  
  const teams = new Set();
  data.matches.forEach(m => {
    teams.add(m.team1);
    teams.add(m.team2);
  });
  
  console.log(`Total Teams parsed from matches: ${teams.size}`);
  console.log('List of teams:', Array.from(teams).sort());
  
  // Show a sample match
  console.log('\nSample match:', data.matches[0]);
}

main().catch(console.error);
