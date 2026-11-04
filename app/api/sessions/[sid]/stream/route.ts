import { connection, type NextRequest } from "next/server";
import { isSessionId, snapshot } from "@/lib/server/sessions";
import { sseResponse } from "@/lib/sse";

/** The client extrapolates between snapshots, so 1 s is smooth enough. */
const INTERVAL_MS = 1000;

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/sessions/[sid]/stream">,
) {
  await connection();
  const { sid } = await ctx.params;
  if (!isSessionId(sid)) return new Response("Unknown session", { status: 404 });

  return sseResponse({
    event: "snapshot",
    tick: () => snapshot(sid),
    intervalMs: INTERVAL_MS,
    signal: request.signal,
  });
}
