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
    const { inviteCode, password } = body;

    if (!inviteCode) {
      return NextResponse.json({ error: "El código de invitación es obligatorio." }, { status: 400 });
    }

    const group = await db.group.findUnique({
      where: { inviteCode },
      include: {
        members: true
      }
    });

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado." }, { status: 404 });
    }

    if (group.members.length >= group.maxMembers) {
      return NextResponse.json({ error: "El grupo ha alcanzado el límite de miembros." }, { status: 400 });
    }

    if (group.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: "Se requiere contraseña para unirse a este grupo." }, { status: 400 });
      }
      const isValid = await bcrypt.compare(password, group.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
      }
    }

    const existing = group.members.find(m => m.userId === userId);
    if (existing) {
      return NextResponse.json({ success: true, group, message: "Ya perteneces a este grupo." });
    }

    await db.groupMember.create({
      data: {
        userId,
        groupId: group.id,
        totalPoints: 0
      }
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error("Error en POST /api/groups/join:", error);
    return NextResponse.json({ error: "Error al unirse al grupo", details: error.message }, { status: 500 });
  }
}
