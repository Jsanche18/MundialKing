import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const { groupId } = params;

    const members = await db.groupMember.findMany({
      where: { groupId },
      include: {
        user: true,
        selectedTeam: true,
        selectedPlayer: true,
        selectedPlayer2: true,
        selectedWeakTeam: true,
        predictedTopScorer: true
      },
      orderBy: { totalPoints: "desc" }
    });

    const formattedMembers = members.map(m => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100`, 
      totalPoints: m.totalPoints,
      exactScores: m.exactScores,
      tendencies: m.tendencies,
      draftGoalsPoints: m.draftGoalsPoints,
      selectedTeamId: m.selectedTeamId,
      selectedTeamName: m.selectedTeam ? m.selectedTeam.name : null,
      selectedPlayerId: m.selectedPlayerId,
      selectedPlayerName: m.selectedPlayer ? m.selectedPlayer.name : null,
      selectedPlayer2Id: m.selectedPlayer2Id,
      selectedPlayer2Name: m.selectedPlayer2 ? m.selectedPlayer2.name : null,
      selectedWeakTeamId: m.selectedWeakTeamId,
      selectedWeakTeamName: m.selectedWeakTeam ? m.selectedWeakTeam.name : null,
      predictedTopScorerId: m.predictedTopScorerId,
      predictedTopScorerName: m.predictedTopScorer ? m.predictedTopScorer.name : null
    }));

    return NextResponse.json(formattedMembers);
  } catch (error: any) {
    console.error("Error en GET /api/groups/[groupId]/standings:", error);
    return NextResponse.json({ error: "Error al cargar la clasificación", details: error.message }, { status: 500 });
  }
}
