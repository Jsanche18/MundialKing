import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || req.headers.get("X-User-Id");
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const body = await req.json();
    const { name, password } = body; // Group name, optional password

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre del grupo es obligatorio." }, { status: 400 });
    }

    const inviteCode = "MUNDIAL-" + Math.random().toString(36).substring(2, 6).toUpperCase();

    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const group = await db.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name,
          inviteCode,
          passwordHash,
          maxMembers: 10
        }
      });

      await tx.groupMember.create({
        data: {
          userId,
          groupId: g.id,
          totalPoints: 0
        }
      });

      return g;
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error("Error en POST /api/groups/create:", error);
    return NextResponse.json({ error: "Error al crear el grupo", details: error.message }, { status: 500 });
  }
}
