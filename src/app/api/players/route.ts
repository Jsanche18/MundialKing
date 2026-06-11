import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "Falta groupId" }, { status: 400 });
    }

    const players = await db.player.findMany({
      orderBy: { name: "asc" }
    });

    const teams = await db.team.findMany();

    const members = await db.groupMember.findMany({
      where: { groupId },
      include: { user: true }
    });

    const formattedPlayers = players.map(player => {
      const team = teams.find(t => t.apiId === player.teamId);
      const draftedByMember = members.find(m => m.selectedPlayerId === player.apiId || m.selectedPlayer2Id === player.apiId);
      
      return {
        apiId: player.apiId,
        name: player.name,
        teamName: team ? team.name : "Desconocido",
        position: player.position,
        photoUrl: player.photoUrl,
        draftedBy: draftedByMember ? {
          userId: draftedByMember.userId,
          userName: draftedByMember.user.name
        } : null
      };
    });

    return NextResponse.json(formattedPlayers);
  } catch (error: any) {
    console.error("Error en GET /api/players:", error);
    return NextResponse.json({ error: "Error al cargar jugadores", details: error.message }, { status: 500 });
  }
}
