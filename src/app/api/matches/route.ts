import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { syncLiveMatches } from "@/lib/live-sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || req.headers.get("X-User-Id");
    
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    // Fallback sync for Hobby plans: Check if there are active matches that haven't been updated in the last 5 minutes
    const now = new Date();
    const activeMatches = await db.match.findMany({
      where: {
        status: { not: "FT" },
        kickoffTimestamp: { lte: now }
      }
    });

    if (activeMatches.length > 0) {
      const lastUpdated = Math.max(...activeMatches.map(m => m.updatedAt.getTime()));
      const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;
      if (lastUpdated < fiveMinutesAgo) {
        console.log("Hobby Live Sync: Triggering real-time update from matches API...");
        try {
          await syncLiveMatches();
        } catch (e) {
          console.error("Error in Hobby Live Sync:", e);
        }
      }
    }

    const matches = await db.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          where: { groupId: groupId || "" },
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { kickoffTimestamp: "asc" }
    });

    const nowTime = now.getTime();
    const formattedMatches = matches.map(match => {
      const userPred = match.predictions?.find(p => p.userId === userId) || null;
      
      const kickoffTime = new Date(match.kickoffTimestamp).getTime();
      const diffMins = (kickoffTime - nowTime) / (1000 * 60);
      const isLocked = match.status === "FT" || match.status === "LIVE" || diffMins <= 15;

      const otherPredictions = isLocked && match.predictions
        ? match.predictions
            .filter(p => p.userId !== userId)
            .map(p => ({
              userId: p.userId,
              userName: p.user.name,
              homeGoals: p.homeGoals,
              awayGoals: p.awayGoals
            }))
        : [];

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
        userPrediction: userPred ? {
          homeGoals: userPred.homeGoals,
          awayGoals: userPred.awayGoals
        } : null,
        otherPredictions
      };
    });

    return NextResponse.json(formattedMatches);
  } catch (error: any) {
    console.error("Error en GET /api/matches:", error);
    return NextResponse.json({ error: "Error al cargar partidos", details: error.message }, { status: 500 });
  }
}
