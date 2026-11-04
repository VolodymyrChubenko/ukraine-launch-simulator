import type { NextRequest } from "next/server";
import { isSpeed } from "@/lib/launches";
import { isSessionId, setSpeed } from "@/lib/server/sessions";

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/sessions/[sid]/speed">,
) {
  const { sid } = await ctx.params;
  if (!isSessionId(sid)) return new Response("Unknown session", { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    speed?: unknown;
  } | null;
  if (!isSpeed(body?.speed)) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  return Response.json(setSpeed(sid, body.speed));
}
