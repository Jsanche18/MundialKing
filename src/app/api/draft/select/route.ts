import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || req.headers.get("X-User-Id");
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const body = await req.json();
    const { type, id, groupId } = body; 

    if (!type || id === undefined || !groupId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const member = await db.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } }
    });

    if (!member) {
      return NextResponse.json({ error: "El usuario no pertenece a este grupo" }, { status: 404 });
    }

    if (type === "team") {
      try {
        await db.$transaction(async (tx) => {
          const taken = await tx.groupMember.findFirst({
            where: {
              groupId,
              selectedTeamId: Number(id),
              NOT: { userId }
            }
          });

          if (taken) {
            throw new Error("TEAM_TAKEN");
          }

          const isCurrentChoice = member.selectedTeamId === Number(id);
          await tx.groupMember.update({
            where: { userId_groupId: { userId, groupId } },
            data: {
              selectedTeamId: isCurrentChoice ? null : Number(id)
            }
          });
        });

        return NextResponse.json({ success: true, message: "Selección de equipo procesada con éxito." });
      } catch (err: any) {
        if (err.message === "TEAM_TAKEN") {
          return NextResponse.json({ error: "Este equipo ya ha sido seleccionado por otro miembro." }, { status: 409 });
        }
        throw err;
      }
    }

    if (type === "player") {
      try {
        await db.$transaction(async (tx) => {
          const taken = await tx.groupMember.findFirst({
            where: {
              groupId,
              selectedPlayerId: Number(id),
              NOT: { userId }
            }
          });

          if (taken) {
            throw new Error("PLAYER_TAKEN");
          }

          const isCurrentChoice = member.selectedPlayerId === Number(id);
          await tx.groupMember.update({
            where: { userId_groupId: { userId, groupId } },
            data: {
              selectedPlayerId: isCurrentChoice ? null : Number(id)
            }
          });
        });

        return NextResponse.json({ success: true, message: "Fichaje de jugador procesado con éxito." });
      } catch (err: any) {
        if (err.message === "PLAYER_TAKEN") {
          return NextResponse.json({ error: "Este jugador ya ha sido fichado por otro miembro." }, { status: 409 });
        }
        throw err;
      }
    }

    if (type === "topScorer") {
      const firstMatch = await db.match.findFirst({
        orderBy: { kickoffTimestamp: "asc" }
      });

      if (firstMatch) {
        const now = new Date().getTime();
        const firstKickoff = new Date(firstMatch.kickoffTimestamp).getTime();
        const diffMins = (firstKickoff - now) / (1000 * 60);

        if (diffMins <= 60) {
          return NextResponse.json(
            { error: "Predicción de Bota de Oro bloqueada: El torneo inicia en menos de 1 hora." },
            { status: 403 }
          );
        }
      }

      await db.groupMember.update({
        where: { userId_groupId: { userId, groupId } },
        data: {
          predictedTopScorerId: Number(id)
        }
      });

      return NextResponse.json({ success: true, message: "Predicción de Bota de Oro guardada con éxito." });
    }

    return NextResponse.json({ error: "Tipo de draft inválido" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en POST /api/draft/select:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
