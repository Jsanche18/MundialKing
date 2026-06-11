const API_KEY = "de0812e63ebde487db0faaa301f525a6";
const url = "https://v3.football.api-sports.io/players/squads?team=26";

fetch(url, {
  headers: {
    'x-apisports-key': API_KEY
  }
})
.then(res => {
  console.log("Status:", res.status);
  return res.json();
})
.then(data => {
  console.log("Response data:", JSON.stringify(data, null, 2));
})
.catch(err => {
  console.error("Error:", err);
});
