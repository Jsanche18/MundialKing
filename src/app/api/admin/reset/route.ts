import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Endpoint temporal de limpieza — se eliminará tras el uso
export async function POST(req: Request) {
  const { secret } = await req.json();
  
  if (secret !== "LIMPIAR_MUNDIALKING_2026") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const predictions = await db.prediction.deleteMany({});
  const members = await db.groupMember.deleteMany({});
  const groups = await db.group.deleteMany({});
  const users = await db.user.deleteMany({});

  return NextResponse.json({
    success: true,
    deleted: {
      predictions: predictions.count,
      members: members.count,
      groups: groups.count,
      users: users.count
    }
  });
}
