import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Validar usando la clave secreta ya configurada en las variables de entorno
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const users = await db.user.findMany({
      include: {
        members: {
          include: {
            group: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            predictions: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      predictionsCount: u._count.predictions,
      groups: u.members.map(m => m.group.name)
    }));

    return NextResponse.json({
      success: true,
      totalUsers: formattedUsers.length,
      users: formattedUsers
    });
  } catch (error: any) {
    console.error("Error en GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios", details: error.message },
      { status: 500 }
    );
  }
}
