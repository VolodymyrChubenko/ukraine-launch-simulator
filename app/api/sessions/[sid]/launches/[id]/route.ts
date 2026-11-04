import type { NextRequest } from "next/server";
import { dismissLabel, isSessionId } from "@/lib/server/sessions";

/** Only `{ labelDismissed: true }` is supported: hides the result label. */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/sessions/[sid]/launches/[id]">,
) {
  const { sid, id } = await ctx.params;
  if (!isSessionId(sid)) return new Response("Unknown session", { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    labelDismissed?: unknown;
  } | null;
  if (body?.labelDismissed !== true) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const launch = dismissLabel(sid, id);
  return launch
    ? Response.json(launch)
    : Response.json({ error: "not_found" }, { status: 404 });
}
