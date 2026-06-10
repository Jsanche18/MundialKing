import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Autorización mediante cabecera Bearer Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forceRun = searchParams.get("force") === "true";
    const simulateRun = searchParams.get("simulate") === "true";

    // 2. Comprobar si hay partidos activos en PostgreSQL para proteger la cuota
    // Ventana de juego activa: status != "FT" y kickoff <= ahora y kickoff >= ahora - 120 minutos (2 horas)
    const now = new Date();
    const windowStart = new Date(now.getTime() - 120 * 60 * 1000);

    const activeMatchesInDb = await db.match.findMany({
      where: {
        status: { not: "FT" },
        kickoffTimestamp: {
          lte: now,
          gte: windowStart
        }
      }
    });

    console.log(`Smart Cron: Encontrados ${activeMatchesInDb.length} partidos activos en ventana de juego.`);

    // Si no hay partidos activos en la BD y no se fuerza/simula la ejecución, salimos a coste cero
    if (activeMatchesInDb.length === 0 && !forceRun && !simulateRun) {
      return NextResponse.json({
        success: true,
        activeMatches: 0,
        fetchedExternal: false,
        message: "No hay partidos en juego en este momento. Protección de cuota activada (0 llamadas consumidas)."
      });
    }

    const apiKey = process.env.API_FOOTBALL_KEY;
    const isSimulation = !apiKey || apiKey === "your_api_football_key_here" || simulateRun;

    let liveFixtures: any[] = [];

    if (isSimulation) {
      console.log("Ejecutando en modo de SIMULACIÓN de partido en vivo...");
      // Simulación: Buscamos el partido 1003 (Canadá vs Bosnia) y fingimos que termina 2-1
      const match1003 = await db.match.findUnique({ where: { apiId: 1003 } });
      if (match1003 && match1003.status !== "FT") {
        liveFixtures = [
          {
            fixture: { id: 1003, status: { short: "FT" } },
            goals: { home: 2, away: 1 },
            events: [
              { type: "Goal", player: { id: 102, name: "Christian Pulisic" }, assist: { id: 104, name: "Alphonso Davies" } }
            ]
          }
        ];
      } else {
        return NextResponse.json({
          success: true,
          activeMatches: activeMatchesInDb.length,
          fetchedExternal: false,
          message: "Simulación: El partido de prueba 1003 ya se encuentra finalizado en la BD."
        });
      }
    } else {
      console.log("Realizando petición externa a API-Football (Directa v3.football.api-sports.io)...");
      // Consulta directa a la API externa de API-Sports (Football)
      const response = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Error al consumir API-Football: ${response.statusText}`);
      }

      const data = await response.json();
      liveFixtures = data.response || [];
    }

    let processedCount = 0;
    let finishedMatchesCount = 0;

    // 3. Iterar por cada partido en vivo de la respuesta
    for (const fixtureInfo of liveFixtures) {
      const matchId = fixtureInfo.fixture.id;
      const apiStatus = fixtureInfo.fixture.status.short;
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

      // 4. ALGORITMO DE PUNTUACIÓN ATÓMICO (Sólo si el partido acaba de finalizar)
      if (justFinished) {
        finishedMatchesCount++;
        console.log(`Partido ${matchId} finalizado. Obteniendo eventos de goles/asistencias...`);

        let events: any[] = [];
        if (isSimulation) {
          events = fixtureInfo.events || [];
        } else {
          // Consultar eventos del partido directamente a API-Football
          const eventsResponse = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${matchId}`, {
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

            // B. PUNTUAR EVENTOS DE JUGADOR DRAFT EXCLUSIVO
            if (member.selectedPlayerId) {
              const draftedPlayerId = member.selectedPlayerId;

              // Filtrar goles y asistencias del jugador en este encuentro
              const playerGoals = events.filter(e => e.type === "Goal" && e.player?.id === draftedPlayerId).length;
              const playerAssists = events.filter(e => e.type === "Goal" && e.assist?.id === draftedPlayerId).length;

              const totalGoalsAndAssists = playerGoals + playerAssists;
              if (totalGoalsAndAssists > 0) {
                pointsGained += totalGoalsAndAssists;
                draftGoalsIncrement = totalGoalsAndAssists;
              }
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

    return NextResponse.json({
      success: true,
      activeMatches: activeMatchesInDb.length,
      fetchedExternal: !isSimulation,
      processedLiveMatches: processedCount,
      finishedMatchesCalculated: finishedMatchesCount,
      simulation: isSimulation,
      message: "Smart Cron ejecutado correctamente."
    });

  } catch (error: any) {
    console.error("Error en GET /api/cron/live:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
