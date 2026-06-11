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
    const { groupId } = body;

    if (!groupId) {
      return NextResponse.json({ error: "El ID del grupo es obligatorio." }, { status: 400 });
    }

    // Verificar si el usuario es miembro del grupo
    const membership = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro de este grupo." }, { status: 404 });
    }

    // Eliminar la membresía y todas las predicciones asociadas al usuario en este grupo
    await db.$transaction(async (tx) => {
      // 1. Eliminar predicciones del usuario en este grupo
      await tx.prediction.deleteMany({
        where: {
          userId,
          groupId
        }
      });

      // 2. Eliminar la membresía del grupo
      await tx.groupMember.delete({
        where: {
          id: membership.id
        }
      });
    });

    return NextResponse.json({ success: true, message: "Te has salido del grupo con éxito." });
  } catch (error: any) {
    console.error("Error en POST /api/groups/leave:", error);
    return NextResponse.json({ error: "Error al salir del grupo", details: error.message }, { status: 500 });
  }
}
