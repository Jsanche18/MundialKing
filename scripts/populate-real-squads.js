const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma
const prisma = new PrismaClient();

// Load environment variables manually for robustness on Windows
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

// Translate API positions to Spanish
function translatePosition(pos) {
  if (!pos) return 'Centrocampista';
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p.includes('portero')) return 'Portero';
  if (p.includes('defender') || p.includes('defense') || p.includes('defensa')) return 'Defensa';
  if (p.includes('midfielder') || p.includes('midfield') || p.includes('volante') || p.includes('centrocampista')) return 'Centrocampista';
  if (p.includes('attacker') || p.includes('striker') || p.includes('forward') || p.includes('delantero') || p.includes('wing')) return 'Delantero';
  return 'Centrocampista';
}

// Fetch helper with retry logic
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

async function main() {
  if (!API_KEY || API_KEY === 'your_api_football_key_here') {
    throw new Error('API_FOOTBALL_KEY no está configurada en las variables de entorno (.env).');
  }

  console.log('=== POBLANDO JUGADORES REALES DESDE LA API (MUNDIAL 2026) ===');

  const teams = await prisma.team.findMany({
    where: {
      apiId: {
        lt: 99000 // Only official teams, ignore knockout placeholders
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Encontradas ${teams.length} selecciones oficiales en la base de datos.`);
  console.log('Se consultará la API de API-Football con pausas de 6.5 segundos para respetar los límites de cuota (10 peticiones/minuto).\n');

  const headers = {
    'x-apisports-key': API_KEY
  };

  let totalRealPlayers = 0;

  for (let idx = 0; idx < teams.length; idx++) {
    const team = teams[idx];
    console.log(`[${idx + 1}/${teams.length}] Procesando: ${team.name} (ID: ${team.apiId})...`);

    const squadUrl = `https://${API_HOST}/players/squads?team=${team.apiId}`;
    try {
      const squadData = await fetchWithRetry(squadUrl, { headers });
      
      // Verify response has results
      if (squadData.errors && Object.keys(squadData.errors).length > 0 && squadData.errors.requests) {
        console.warn(`[ALERTA API] Límite diario alcanzado o error de suscripción: ${JSON.stringify(squadData.errors)}`);
        console.log('Se mantendrán los jugadores actuales para las selecciones restantes.');
        break;
      }

      const squadInfo = squadData.response?.[0];
      const playersList = squadInfo?.players || [];

      if (playersList.length > 0) {
        console.log(` -> Encontrados ${playersList.length} jugadores reales en la API.`);
        
        // Use a transaction to safely clean old players and insert new ones
        await prisma.$transaction(async (tx) => {
          // Delete old players for this team
          await tx.player.deleteMany({
            where: { teamId: team.apiId }
          });

          // Insert new ones in bulk
          const playersData = playersList.map(p => ({
            apiId: p.id,
            name: p.name,
            teamId: team.apiId,
            position: translatePosition(p.position),
            photoUrl: p.photo || 'https://media.api-sports.io/football/players/unknown.png'
          }));

          await tx.player.createMany({
            data: playersData,
            skipDuplicates: true
          });
        });

        totalRealPlayers += playersList.length;
        console.log(` -> Guardada plantilla de ${playersList.length} jugadores reales en Supabase.`);
      } else {
        console.log(` -> No se encontraron jugadores en la API para ${team.name}. Manteniendo actuales.`);
      }
    } catch (err) {
      console.error(`Error no crítico procesando ${team.name} (ID: ${team.apiId}): ${err.message}. Se mantiene la plantilla actual.`);
    }

    // Rate-limit safety pause
    if (idx < teams.length - 1) {
      await delay(6500);
    }
  }

  console.log('\n======================================================');
  console.log(`PROCESO FINALIZADO. Se poblaron ${totalRealPlayers} jugadores reales.`);
  console.log('======================================================');
}

main()
  .catch(e => {
    console.error('ERROR EN EL PROCESO DE ACTUALIZACIÓN:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
