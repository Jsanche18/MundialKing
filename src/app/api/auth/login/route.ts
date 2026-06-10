import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    const member = await db.groupMember.findFirst({
      where: { userId: user.id },
      include: { group: true }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      groupId: member ? member.groupId : null,
      groupInviteCode: member ? member.group.inviteCode : null
    });
  } catch (error: any) {
    console.error("Error en POST /api/auth/login:", error);
    return NextResponse.json({ error: "Error al iniciar sesión", details: error.message }, { status: 500 });
  }
}
