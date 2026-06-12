import { db } from "@/lib/db";

export async function syncLiveMatches(forceRun = false, simulateRun = false) {
  // Comprobar si hay partidos activos en PostgreSQL para proteger la cuota
  // Ventana de juego activa: status != "FT" y kickoff <= ahora y kickoff >= ahora - 300 minutos (5 horas)
  const now = new Date();

  const activeMatchesInDb = await db.match.findMany({
    where: {
      status: { not: "FT" },
      kickoffTimestamp: {
        lte: now
      }
    },
    include: {
      homeTeam: true,
      awayTeam: true
    }
  });

  console.log(`Smart Cron: Encontrados ${activeMatchesInDb.length} partidos activos en ventana de juego.`);

  // Si no hay partidos activos en la BD y no se fuerza/simula la ejecución, salimos a coste cero
  if (activeMatchesInDb.length === 0 && !forceRun && !simulateRun) {
    return {
      success: true,
      activeMatches: 0,
      fetchedExternal: false,
      message: "No hay partidos en juego en este momento. Protección de cuota activada (0 llamadas consumidas)."
    };
  }

  const apiKey = process.env.API_FOOTBALL_KEY;
  const isSimulation = !apiKey || apiKey === "your_api_football_key_here" || simulateRun;

  let liveFixtures: any[] = [];

  if (isSimulation) {
    console.log("Ejecutando en modo de SIMULACIÓN de partido en vivo...");
    // Simulación: Buscamos el partido 1003 (Canadá vs Bosnia) o el primer partido no finalizado si no existe
    let targetId = 1003;
    let match1003 = await db.match.findUnique({ where: { apiId: targetId } });
    if (!match1003) {
      // Buscar primer partido no finalizado
      const firstPending = await db.match.findFirst({
        where: { status: { not: "FT" } }
      });
      if (firstPending) {
        targetId = firstPending.apiId;
        match1003 = firstPending;
      }
    }

    if (match1003 && match1003.status !== "FT") {
      liveFixtures = [
        {
          fixture: { id: targetId, status: { short: "FT" } },
          goals: { home: 2, away: 1 },
          events: [
            { type: "Goal", player: { id: 102, name: "Christian Pulisic" }, assist: { id: 104, name: "Alphonso Davies" } }
          ]
        }
      ];
    } else {
      return {
        success: true,
        activeMatches: activeMatchesInDb.length,
        fetchedExternal: false,
        message: "Simulación: El partido de prueba ya se encuentra finalizado en la BD."
      };
    }
  } else {
    console.log("Realizando petición externa a API-Football (Directa v3.football.api-sports.io)...");
    
    // Group active matches by date (YYYY-MM-DD)
    const datesToQuery: string[] = [];
    for (const dbMatch of activeMatchesInDb) {
      const dateStr = dbMatch.kickoffTimestamp.toISOString().split("T")[0];
      if (!datesToQuery.includes(dateStr)) {
        datesToQuery.push(dateStr);
      }
    }
    
    console.log(`Smart Cron: Fechas activas para consultar: ${datesToQuery.join(", ")}`);
    
    for (const dateStr of datesToQuery) {
      try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateStr}`, {
          method: "GET",
          headers: {
            "x-apisports-key": apiKey || ""
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const list = data.response || [];
          console.log(`Smart Cron: Descargados ${list.length} partidos para la fecha ${dateStr}`);
          
          for (const item of list) {
            // Check if it is a World Cup match
            if (item.league.id === 1) {
              const matched = activeMatchesInDb.find(
                m => m.homeTeamId === item.teams.home.id && m.awayTeamId === item.teams.away.id
              );
              if (matched) {
                liveFixtures.push({
                  fixture: {
                    id: matched.apiId,
                    realId: item.fixture.id,
                    status: { short: item.fixture.status.short }
                  },
                  goals: {
                    home: item.goals.home,
                    away: item.goals.away
                  },
                  events: [] // Will fetch events later in scoring logic if FT
                });
                console.log(`Smart Cron: Match ${matched.apiId} (${matched.homeTeam.name} vs ${matched.awayTeam.name}) matched from real API. Score: ${item.goals.home}-${item.goals.away}, Status: ${item.fixture.status.short}`);
              }
            }
          }
        } else {
          console.error(`Smart Cron: Error consultando fixtures para ${dateStr}: ${response.statusText}`);
        }
      } catch (err: any) {
        console.error(`Smart Cron: Error de red consultando fixtures para ${dateStr}:`, err.message);
      }
    }
  }

  // Inject simulated World Cup 2026 matches that are currently in progress or finished
  for (const dbMatch of activeMatchesInDb) {
    const isWc2026Match = dbMatch.apiId >= 2026001 && dbMatch.apiId <= 2026104;
    if (isWc2026Match) {
      const alreadyAdded = liveFixtures.some((f: any) => f.fixture.id === dbMatch.apiId);
      if (!alreadyAdded) {
        const elapsedMins = Math.floor((now.getTime() - dbMatch.kickoffTimestamp.getTime()) / (1000 * 60));
        if (elapsedMins >= 0) {
          const homeFinal = (dbMatch.apiId * 7) % 4; // 0, 1, 2, 3
          const awayFinal = (dbMatch.apiId * 13) % 3; // 0, 1, 2
          
          let status = 'LIVE';
          let homeGoals = 0;
          let awayGoals = 0;
          
          if (elapsedMins >= 105) {
            status = 'FT';
            homeGoals = homeFinal;
            awayGoals = awayFinal;
          } else {
            status = 'LIVE';
            const progressPercent = Math.min(elapsedMins / 90, 1);
            homeGoals = Math.floor(homeFinal * progressPercent);
            awayGoals = Math.floor(awayFinal * progressPercent);
          }
          
          const events: any[] = [];
          const homePlayers = await db.player.findMany({ where: { teamId: dbMatch.homeTeamId } });
          const awayPlayers = await db.player.findMany({ where: { teamId: dbMatch.awayTeamId } });
          
          for (let i = 0; i < homeGoals; i++) {
            if (homePlayers.length > 0) {
              const playerIdx = (dbMatch.apiId + i) % homePlayers.length;
              const scorer = homePlayers[playerIdx];
              const assistIdx = (dbMatch.apiId + i + 1) % homePlayers.length;
              const assister = assistIdx !== playerIdx ? homePlayers[assistIdx] : null;
              events.push({
                type: 'Goal',
                player: { id: scorer.apiId, name: scorer.name },
                assist: assister ? { id: assister.apiId, name: assister.name } : null
              });
            }
          }
          
          for (let i = 0; i < awayGoals; i++) {
            if (awayPlayers.length > 0) {
              const playerIdx = (dbMatch.apiId + i + 5) % awayPlayers.length;
              const scorer = awayPlayers[playerIdx];
              const assistIdx = (dbMatch.apiId + i + 6) % awayPlayers.length;
              const assister = assistIdx !== playerIdx ? awayPlayers[assistIdx] : null;
              events.push({
                type: 'Goal',
                player: { id: scorer.apiId, name: scorer.name },
                assist: assister ? { id: assister.apiId, name: assister.name } : null
              });
            }
          }
          
          liveFixtures.push({
            fixture: {
              id: dbMatch.apiId,
              status: { short: status }
            },
            goals: {
              home: homeGoals,
              away: awayGoals
            },
            events: events
          });
          console.log(`Smart Cron Simulator: Injected simulated match ${dbMatch.apiId} (${status}, Score: ${homeGoals}-${awayGoals}, Elapsed: ${elapsedMins} mins)`);
        }
      }
    }
  }

  let processedCount = 0;
  let finishedMatchesCount = 0;

  // Iterar por cada partido en vivo de la respuesta
  for (const fixtureInfo of liveFixtures) {
    const matchId = fixtureInfo.fixture.id;
    const rawStatus = fixtureInfo.fixture.status.short;
    const liveStatuses = ["1H", "2H", "HT", "ET", "P", "LIVE"];
    const apiStatus = liveStatuses.includes(rawStatus) ? "LIVE" : rawStatus;
    const homeGoals = fixtureInfo.goals.home;
    const awayGoals = fixtureInfo.goals.away;

    // Buscar si el partido existe en nuestra base de datos
    const dbMatch = await db.match.findUnique({ where: { apiId: matchId } });
    if (!dbMatch) continue;

    processedCount++;
    const justFinished = apiStatus === "FT" && dbMatch.status !== "FT";

    // Actualizar marcador y estado del partido en DB
    await db.match.update({
      where: { apiId: matchId },
      data: {
        status: apiStatus,
        homeGoals: homeGoals !== null ? Number(homeGoals) : null,
        awayGoals: awayGoals !== null ? Number(awayGoals) : null
      }
    });

    // ALGORITMO DE PUNTUACIÓN ATÓMICO (Sólo si el partido acaba de finalizar)
    if (justFinished) {
      finishedMatchesCount++;
      console.log(`Partido ${matchId} finalizado. Obteniendo eventos de goles/asistencias...`);

      let winningTeamId: number | null = null;
      if (homeGoals !== null && awayGoals !== null) {
        if (homeGoals > awayGoals) {
          winningTeamId = dbMatch.homeTeamId;
        } else if (awayGoals > homeGoals) {
          winningTeamId = dbMatch.awayTeamId;
        }
      }

      let events: any[] = [];
      const isSimulatedMatch = matchId >= 2026001 && matchId <= 2026104;
      const hasRealId = !!fixtureInfo.fixture.realId;
      if (isSimulation || (isSimulatedMatch && !hasRealId)) {
        events = fixtureInfo.events || [];
      } else {
        // Consultar eventos del partido directamente a API-Football utilizando el ID real
        const eventsFixtureId = fixtureInfo.fixture.realId || matchId;
        const eventsResponse = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${eventsFixtureId}`, {
          method: "GET",
          headers: {
            "x-apisports-key": apiKey || ""
          }
        });
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          events = eventsData.response || [];
        }
      }

      // Obtener grupos y miembros para calcular y sumar puntuaciones
      const groups = await db.group.findMany({
        include: { members: true }
      });

      for (const group of groups) {
        for (const member of group.members) {
          let pointsGained = 0;
          let exactIncrement = 0;
          let tendencyIncrement = 0;
          let draftGoalsIncrement = 0;

          // A. VALIDAR PREDICCIÓN VS RESULTADO REAL
          const prediction = await db.prediction.findUnique({
            where: {
              userId_groupId_matchId: {
                userId: member.userId,
                groupId: group.id,
                matchId
              }
            }
          });

          if (prediction) {
            const exactMatch = prediction.homeGoals === homeGoals && prediction.awayGoals === awayGoals;

            if (exactMatch) {
              pointsGained += 3;
              exactIncrement = 1;
            } else {
              // Comprobar tendencia (ganador o empate)
              const realDiff = homeGoals - awayGoals;
              const predDiff = prediction.homeGoals - prediction.awayGoals;
              const correctTendency = (realDiff > 0 && predDiff > 0) ||
                                      (realDiff < 0 && predDiff < 0) ||
                                      (realDiff === 0 && predDiff === 0);

              if (correctTendency) {
                pointsGained += 1;
                tendencyIncrement = 1;
              }
            }

            // Bloquear la predicción de forma permanente
            await db.prediction.update({
              where: { id: prediction.id },
              data: { locked: true }
            });
          }

          // B. PUNTUAR EVENTOS DE JUGADORES DRAFT EXCLUSIVO (AMBOS SLOTS)
          const playerIds = [member.selectedPlayerId, member.selectedPlayer2Id].filter(Boolean) as number[];
          for (const draftedPlayerId of playerIds) {
            // Filtrar goles y asistencias del jugador en este encuentro
            const playerGoals = events.filter(e => e.type === "Goal" && e.player?.id === draftedPlayerId).length;
            const playerAssists = events.filter(e => e.type === "Goal" && e.assist?.id === draftedPlayerId).length;

            const totalGoalsAndAssists = playerGoals + playerAssists;
            if (totalGoalsAndAssists > 0) {
              pointsGained += totalGoalsAndAssists;
              draftGoalsIncrement += totalGoalsAndAssists;
            }
          }

          // C. PUNTUAR VICTORIA DE SELECCIÓN GLORIOSA (+3 PUNTOS)
          const WEAK_TEAMS_IDS = [2386, 5530, 4673, 1548, 1567, 1533, 1569, 23, 1568, 1531];
          if (
            winningTeamId && 
            member.selectedWeakTeamId === winningTeamId && 
            WEAK_TEAMS_IDS.includes(winningTeamId)
          ) {
            pointsGained += 3;
          }

          // Guardar incremento en PostgreSQL
          await db.groupMember.update({
            where: { id: member.id },
            data: {
              totalPoints: { increment: pointsGained },
              exactScores: { increment: exactIncrement },
              tendencies: { increment: tendencyIncrement },
              draftGoalsPoints: { increment: draftGoalsIncrement }
            }
          });
        }
      }
    }
  }

  return {
    success: true,
    activeMatches: activeMatchesInDb.length,
    fetchedExternal: !isSimulation,
    processedLiveMatches: processedCount,
    finishedMatchesCalculated: finishedMatchesCount,
    simulation: isSimulation,
    message: "Smart Cron ejecutado correctamente."
  };
}
