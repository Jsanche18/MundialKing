const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Carga manual del archivo .env para asegurar robustez en Windows
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

const API_HOST = 'v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper para realizar llamadas con reintentos y exponencial backoff
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        console.warn(`[429] Demasiadas peticiones. Esperando ${backoff * 2}ms antes de reintentar...`);
        await delay(backoff * 2);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      const isLast = i === retries - 1;
      console.error(`Intento ${i + 1} fallido para ${url}: ${error.message}`);
      if (isLast) throw error;
      await delay(backoff);
      backoff *= 2;
    }
  }
}

// Mapeador de posiciones
function translatePosition(pos) {
  if (!pos) return 'Centrocampista';
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p.includes('portero')) return 'Portero';
  if (p.includes('defender') || p.includes('defense') || p.includes('defensa')) return 'Defensa';
  if (p.includes('midfielder') || p.includes('midfield') || p.includes('volante') || p.includes('centrocampista')) return 'Centrocampista';
  if (p.includes('attacker') || p.includes('striker') || p.includes('forward') || p.includes('delantero') || p.includes('wing')) return 'Delantero';
  return 'Centrocampista';
}

// Parseador de hora con offset de openfootball
function parseKickoff(dateStr, timeStr) {
  const timePart = timeStr ? timeStr.split(' ')[0] : '12:00';
  const utcPart = timeStr ? timeStr.split(' ')[1] : 'UTC-5'; // Default to Central Time offset
  let offset = utcPart.replace('UTC', '');
  
  if (!offset || offset === 'Z') {
    offset = '+00:00';
  } else if (!offset.includes(':')) {
    const isNeg = offset.startsWith('-');
    const val = Math.abs(parseInt(offset, 10));
    const formattedVal = val.toString().padStart(2, '0');
    offset = `${isNeg ? '-' : '+'}${formattedVal}:00`;
  }
  
  const isoString = `${dateStr}T${timePart}:00${offset}`;
  return new Date(isoString);
}

async function main() {
  if (!API_KEY || API_KEY === 'your_api_football_key_here') {
    throw new Error('API_FOOTBALL_KEY no está configurada en las variables de entorno (.env).');
  }

  console.log('=== INICIANDO POBLAMIENTO REAL DEL MUNDIAL 2026 (48 EQUIPOS Y 104 PARTIDOS) ===');

  // 1. Limpieza de datos antiguos
  console.log('Limpiando base de datos de manera íntegra...');
  await prisma.prediction.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});
  console.log('Base de datos limpia.');

  // 2. Cargar mapeo de equipos oficiales
  const mappingPath = path.join(__dirname, '../scripts/teams-mapping.json');
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`No se encontró el mapeo de equipos en ${mappingPath}`);
  }
  const teamsMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  const realTeamNames = Object.keys(teamsMapping);
  console.log(`Cargado mapeo de ${realTeamNames.length} equipos oficiales.`);

  // 3. Crear los 48 equipos reales en la BD
  console.log('Guardando los 48 equipos oficiales en PostgreSQL...');
  const savedRealTeams = [];
  for (const name of realTeamNames) {
    const mapped = teamsMapping[name];
    const dbTeam = await prisma.team.create({
      data: {
        apiId: mapped.apiId,
        name: name,
        flagUrl: mapped.flagUrl,
        currentStage: 'Fase de Grupos'
      }
    });
    savedRealTeams.push(dbTeam);
  }
  console.log('Equipos oficiales guardados exitosamente.');

  // 4. Descargar Jugadores (Bypassed due to API limits, handled offline by populate-missing-players.js)
  console.log('\n[API-Football] Omitiendo descarga de jugadores en línea para no agotar la cuota de la API.');
  console.log('Los jugadores se poblarán localmente de forma offline usando el script populate-missing-players.js.');
  let playerCount = 0;

  // 5. Descargar y procesar calendario de 104 partidos de openfootball
  console.log('\nDescargando calendario oficial del Mundial 2026 de openfootball...');
  const openfootballUrl = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const res = await fetch(openfootballUrl);
  if (!res.ok) {
    throw new Error(`Error descargando calendario de openfootball: ${res.statusText}`);
  }
  const data = await res.json();
  const matchesList = data.matches || [];
  console.log(`Descargado calendario con ${matchesList.length} partidos.`);

  let matchIdCounter = 2026001; // ID secuencial para los partidos del 2026
  let placeholderVirtualIds = {};
  let nextVirtualId = 99000; // IDs virtuales para placeholders

  console.log('Guardando partidos y generando equipos virtuales para los placeholders...');
  for (const match of matchesList) {
    let homeTeamId;
    let awayTeamId;

    // Resolver equipo local (Home Team)
    if (teamsMapping[match.team1]) {
      homeTeamId = teamsMapping[match.team1].apiId;
    } else {
      // Es un placeholder
      const pName = match.team1;
      if (!placeholderVirtualIds[pName]) {
        placeholderVirtualIds[pName] = nextVirtualId++;
        // Crear equipo virtual
        await prisma.team.create({
          data: {
            apiId: placeholderVirtualIds[pName],
            name: pName,
            flagUrl: 'https://media.api-sports.io/football/teams/unknown.png',
            currentStage: 'Eliminatorias'
          }
        });
        console.log(` -> Creado equipo virtual: "${pName}" (ID: ${placeholderVirtualIds[pName]})`);
      }
      homeTeamId = placeholderVirtualIds[pName];
    }

    // Resolver equipo visitante (Away Team)
    if (teamsMapping[match.team2]) {
      awayTeamId = teamsMapping[match.team2].apiId;
    } else {
      // Es un placeholder
      const pName = match.team2;
      if (!placeholderVirtualIds[pName]) {
        placeholderVirtualIds[pName] = nextVirtualId++;
        // Crear equipo virtual
        await prisma.team.create({
          data: {
            apiId: placeholderVirtualIds[pName],
            name: pName,
            flagUrl: 'https://media.api-sports.io/football/teams/unknown.png',
            currentStage: 'Eliminatorias'
          }
        });
        console.log(` -> Creado equipo virtual: "${pName}" (ID: ${placeholderVirtualIds[pName]})`);
      }
      awayTeamId = placeholderVirtualIds[pName];
    }

    const kickoff = parseKickoff(match.date, match.time);

    // Crear el partido en la BD
    await prisma.match.create({
      data: {
        apiId: matchIdCounter++,
        homeTeamId: homeTeamId,
        awayTeamId: awayTeamId,
        kickoffTimestamp: kickoff,
        status: 'NS', // Todos empiezan en Not Started
        homeGoals: null,
        awayGoals: null
      }
    });
  }

  console.log(`Se registraron exitosamente ${matchesList.length} partidos en la base de datos.`);
  console.log('\n======================================================');
  console.log('POBLAMIENTO DEL MUNDIAL 2026 COMPLETADO CON ÉXITO!');
  console.log('======================================================');
}

main()
  .catch(e => {
    console.error('\nERROR CRÍTICO EN EL SEED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
