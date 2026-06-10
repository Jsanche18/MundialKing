async function main() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  console.log(`Fetching from: ${url}`);
  const res = await fetch(url);
  console.log(`Status: ${res.status} ${res.statusText}`);
  if (res.ok) {
    const text = await res.text();
    console.log('Content (first 500 chars):', text.slice(0, 500));
  } else {
    console.log('Failed to fetch from openfootball.');
  }
}

main().catch(console.error);
