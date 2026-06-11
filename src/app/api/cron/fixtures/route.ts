import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_HOST;

    // Fallback: If RAPIDAPI_KEY is not configured, do not overwrite the seeded database.
    if (!apiKey || apiKey === "your_rapidapi_key_here") {
      console.log("RAPIDAPI_KEY is not configured. Skipping mock fallback to preserve seeded database.");
      return NextResponse.json({ 
        success: true, 
        message: "Fixtures already populated via seeding. RAPIDAPI_KEY not configured, skipping update." 
      });
    }

    const response = await fetch(`https://${apiHost}/v3/fixtures?league=1&season=2026`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": apiHost || ""
      }
    });

    if (!response.ok) {
      throw new Error(`Error de API: ${response.statusText}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    for (const item of fixtures) {
      const { fixture, teams: apiTeams, goals } = item;
      
      await db.team.upsert({
        where: { apiId: apiTeams.home.id },
        update: { name: apiTeams.home.name, flagUrl: apiTeams.home.logo },
        create: { apiId: apiTeams.home.id, name: apiTeams.home.name, flagUrl: apiTeams.home.logo }
      });

      await db.team.upsert({
        where: { apiId: apiTeams.away.id },
        update: { name: apiTeams.away.name, flagUrl: apiTeams.away.logo },
        create: { apiId: apiTeams.away.id, name: apiTeams.away.name, flagUrl: apiTeams.away.logo }
      });

      await db.match.upsert({
        where: { apiId: fixture.id },
        update: {
          homeTeamId: apiTeams.home.id,
          awayTeamId: apiTeams.away.id,
          kickoffTimestamp: new Date(fixture.date),
          status: fixture.status.short,
          homeGoals: goals.home,
          awayGoals: goals.away
        },
        create: {
          apiId: fixture.id,
          homeTeamId: apiTeams.home.id,
          awayTeamId: apiTeams.away.id,
          kickoffTimestamp: new Date(fixture.date),
          status: fixture.status.short,
          homeGoals: goals.home,
          awayGoals: goals.away
        }
      });
    }

    return NextResponse.json({ success: true, count: fixtures.length, message: "Fixtures y Equipos reales de la API de fútbol sincronizados." });
  } catch (error: any) {
    console.error("Error en GET /api/cron/fixtures:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
