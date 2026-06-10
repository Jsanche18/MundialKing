import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    const matches = await db.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: userId && groupId ? {
          where: { userId, groupId }
        } : false
      },
      orderBy: { kickoffTimestamp: "asc" }
    });

    const formattedMatches = matches.map(match => {
      const pred = match.predictions?.[0] || null;
      return {
        apiId: match.apiId,
        homeTeam: {
          name: match.homeTeam.name,
          flagUrl: match.homeTeam.flagUrl
        },
        awayTeam: {
          name: match.awayTeam.name,
          flagUrl: match.awayTeam.flagUrl
        },
        kickoffTimestamp: match.kickoffTimestamp.toISOString(),
        status: match.status,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        userPrediction: pred ? {
          homeGoals: pred.homeGoals,
          awayGoals: pred.awayGoals
        } : null
      };
    });

    return NextResponse.json(formattedMatches);
  } catch (error: any) {
    console.error("Error en GET /api/matches:", error);
    return NextResponse.json({ error: "Error al cargar partidos", details: error.message }, { status: 500 });
  }
}
