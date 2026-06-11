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

    const teams = await db.team.findMany({
      where: {
        apiId: {
          lt: 99000
        }
      },
      orderBy: { name: "asc" }
    });

    const members = await db.groupMember.findMany({
      where: { groupId },
      include: { user: true }
    });

    const formattedTeams = teams.map(team => {
      const draftedByMember = members.find(m => m.selectedTeamId === team.apiId);
      const gloriousDraftedByMember = members.find(m => m.selectedWeakTeamId === team.apiId);
      return {
        apiId: team.apiId,
        name: team.name,
        flagUrl: team.flagUrl,
        currentStage: team.currentStage,
        draftedBy: draftedByMember ? {
          userId: draftedByMember.userId,
          userName: draftedByMember.user.name
        } : null,
        gloriousDraftedBy: gloriousDraftedByMember ? {
          userId: gloriousDraftedByMember.userId,
          userName: gloriousDraftedByMember.user.name
        } : null
      };
    });

    return NextResponse.json(formattedTeams);
  } catch (error: any) {
    console.error("Error en GET /api/teams:", error);
    return NextResponse.json({ error: "Error al cargar equipos", details: error.message }, { status: 500 });
  }
}
