import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    let userId: string | null = null;
    
    // Intenta obtener la sesión de NextAuth
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // Fallback para pruebas locales de desarrollo y modo demostración
      userId = req.headers.get("X-User-Id");
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Buscar todas las membresías del usuario e incluir los grupos correspondientes
    const memberships = await db.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Extraer los grupos con sus respectivos miembros estructurados
    const groups = memberships.map(m => {
      const g = m.group;
      return {
        id: g.id,
        name: g.name,
        inviteCode: g.inviteCode,
        maxMembers: g.maxMembers,
        members: g.members.map(member => ({
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
          totalPoints: member.totalPoints,
          selectedTeamId: member.selectedTeamId,
          selectedPlayerId: member.selectedPlayerId
        }))
      };
    });

    return NextResponse.json(groups);
  } catch (error: any) {
    console.error("Error en GET /api/groups:", error);
    return NextResponse.json(
      { error: "Error al obtener los grupos", details: error.message },
      { status: 500 }
    );
  }
}
