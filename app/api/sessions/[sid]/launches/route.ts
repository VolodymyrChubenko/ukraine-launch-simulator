import type { NextRequest } from "next/server";
import { createLaunch, isSessionId } from "@/lib/server/sessions";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/sessions/[sid]/launches">,
) {
  const { sid } = await ctx.params;
  if (!isSessionId(sid)) return new Response("Unknown session", { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  const result = createLaunch(sid, body);
  return "error" in result
    ? Response.json(result, { status: 400 })
    : Response.json(result.launch, { status: 201 });
}
