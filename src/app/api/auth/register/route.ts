import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
    }

    const existing = await db.user.findUnique({
      where: { email }
    });

    if (existing) {
      return NextResponse.json({ error: "El correo electrónico ya está registrado." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error("Error en POST /api/auth/register:", error);
    return NextResponse.json({ error: "Error al registrar el usuario", details: error.message }, { status: 500 });
  }
}
