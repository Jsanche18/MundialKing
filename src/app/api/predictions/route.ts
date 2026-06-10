import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || req.headers.get("X-User-Id");
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const body = await req.json();
    const { matchId, groupId, homeGoals, awayGoals } = body;

    if (matchId === undefined || !groupId || homeGoals === undefined || awayGoals === undefined) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const match = await db.match.findUnique({
      where: { apiId: Number(matchId) }
    });

    if (!match) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
    }

    const now = new Date().getTime();
    const kickoffTime = new Date(match.kickoffTimestamp).getTime();
    const diffMins = (kickoffTime - now) / (1000 * 60);

    if (match.status === "FT" || match.status === "LIVE" || diffMins <= 60) {
      return NextResponse.json(
        { error: "Predicción bloqueada: El partido inicia en menos de 60 minutos o ya ha comenzado." },
        { status: 403 }
      );
    }

    const prediction = await db.prediction.upsert({
      where: {
        userId_groupId_matchId: {
          userId,
          groupId,
          matchId: Number(matchId)
        }
      },
      update: {
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        locked: false
      },
      create: {
        userId,
        groupId,
        matchId: Number(matchId),
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        locked: false
      }
    });

    return NextResponse.json({ success: true, prediction });
  } catch (error: any) {
    console.error("Error en PUT /api/predictions:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
