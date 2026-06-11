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

    // ─── Bloqueo global: 15 minutos antes del primer partido ───────────────────
    const firstMatch = await db.match.findFirst({
      orderBy: { kickoffTimestamp: "asc" }
    });

    if (firstMatch) {
      const now = new Date().getTime();
      const firstKickoff = new Date(firstMatch.kickoffTimestamp).getTime();
      const diffMins = (firstKickoff - now) / (1000 * 60);

      if (diffMins <= 15) {
        return NextResponse.json(
          { error: "El draft está cerrado: faltan menos de 15 minutos para el inicio del Mundial." },
          { status: 403 }
        );
      }
    }
    // ───────────────────────────────────────────────────────────────────────────

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
        const newPlayer = await db.player.findUnique({
          where: { apiId: Number(id) }
        });
        if (!newPlayer) {
          return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
        }

        await db.$transaction(async (tx) => {
          // Check if player is already drafted by someone else in either slot
          const taken = await tx.groupMember.findFirst({
            where: {
              groupId,
              OR: [
                { selectedPlayerId: Number(id) },
                { selectedPlayer2Id: Number(id) }
              ],
              NOT: { userId }
            }
          });

          if (taken) {
            throw new Error("PLAYER_TAKEN");
          }

          const isSlot1 = member.selectedPlayerId === Number(id);
          const isSlot2 = member.selectedPlayer2Id === Number(id);

          if (isSlot1) {
            // Release Slot 1
            await tx.groupMember.update({
              where: { userId_groupId: { userId, groupId } },
              data: { selectedPlayerId: null }
            });
          } else if (isSlot2) {
            // Release Slot 2
            await tx.groupMember.update({
              where: { userId_groupId: { userId, groupId } },
              data: { selectedPlayer2Id: null }
            });
          } else {
            // Try to draft new player
            if (member.selectedPlayerId && member.selectedPlayer2Id) {
              throw new Error("PLAYER_LIMIT_REACHED");
            }

            // Check if team is repeated
            let existingTeamId: number | null = null;
            if (member.selectedPlayerId) {
              const p1 = await tx.player.findUnique({ where: { apiId: member.selectedPlayerId } });
              if (p1) existingTeamId = p1.teamId;
            } else if (member.selectedPlayer2Id) {
              const p2 = await tx.player.findUnique({ where: { apiId: member.selectedPlayer2Id } });
              if (p2) existingTeamId = p2.teamId;
            }

            if (existingTeamId !== null && existingTeamId === newPlayer.teamId) {
              throw new Error("SAME_TEAM_FORBIDDEN");
            }

            // Assign to empty slot
            if (!member.selectedPlayerId) {
              await tx.groupMember.update({
                where: { userId_groupId: { userId, groupId } },
                data: { selectedPlayerId: Number(id) }
              });
            } else {
              await tx.groupMember.update({
                where: { userId_groupId: { userId, groupId } },
                data: { selectedPlayer2Id: Number(id) }
              });
            }
          }
        });

        return NextResponse.json({ success: true, message: "Fichaje de jugador procesado con éxito." });
      } catch (err: any) {
        if (err.message === "PLAYER_TAKEN") {
          return NextResponse.json({ error: "Este jugador ya ha sido fichado por otro miembro." }, { status: 409 });
        }
        if (err.message === "PLAYER_LIMIT_REACHED") {
          return NextResponse.json({ error: "Ya has fichado al máximo de 2 jugadores. Libera uno primero." }, { status: 400 });
        }
        if (err.message === "SAME_TEAM_FORBIDDEN") {
          return NextResponse.json({ error: "No puedes fichar a dos jugadores de la misma selección." }, { status: 400 });
        }
        throw err;
      }
    }

    if (type === "weakTeam") {
      try {
        const WEAK_TEAMS_IDS = [2386, 5530, 4673, 1548, 1567, 1533, 1569, 23, 1568, 1531];
        if (!WEAK_TEAMS_IDS.includes(Number(id))) {
          return NextResponse.json({ error: "Este equipo no pertenece a las 10 selecciones débiles permitidas." }, { status: 400 });
        }

        await db.$transaction(async (tx) => {
          // Check if this weak team is already taken by someone else in the group
          const taken = await tx.groupMember.findFirst({
            where: {
              groupId,
              selectedWeakTeamId: Number(id),
              NOT: { userId }
            }
          });

          if (taken) {
            throw new Error("WEAK_TEAM_TAKEN");
          }

          const isCurrentChoice = member.selectedWeakTeamId === Number(id);
          await tx.groupMember.update({
            where: { userId_groupId: { userId, groupId } },
            data: {
              selectedWeakTeamId: isCurrentChoice ? null : Number(id)
            }
          });
        });

        return NextResponse.json({ success: true, message: "Selección de selección gloriosa procesada con éxito." });
      } catch (err: any) {
        if (err.message === "WEAK_TEAM_TAKEN") {
          return NextResponse.json({ error: "Esta selección gloriosa ya ha sido elegida por otro miembro." }, { status: 409 });
        }
        throw err;
      }
    }

    if (type === "topScorer") {
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

