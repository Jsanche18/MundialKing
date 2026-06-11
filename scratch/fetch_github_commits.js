async function main() {
  const url = 'https://api.github.com/repos/Jsanche18/MundialKing/commits';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Node-Fetch'
      }
    });
    if (!res.ok) {
      console.error(`Error: ${res.status} ${res.statusText}`);
      return;
    }
    const data = await res.json();
    console.log(`Found ${data.length} commits on GitHub:`);
    data.slice(0, 5).forEach((c, idx) => {
      console.log(`[${idx}] SHA: ${c.sha.slice(0, 7)} | Author: ${c.commit.author.name} | Message: "${c.commit.message}" | Date: ${c.commit.author.date}`);
    });
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

main();
