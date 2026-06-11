import { NextResponse } from "next/server";
import { syncLiveMatches } from "@/lib/live-sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Autorización mediante cabecera Bearer Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const forceRun = searchParams.get("force") === "true";
    const simulateRun = searchParams.get("simulate") === "true";

    const result = await syncLiveMatches(forceRun, simulateRun);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en GET /api/cron/live:", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
  }
}
