import { connection } from "next/server";
import { getAlertSnapshot } from "@/lib/server/alerts";

export async function GET() {
  // Live data: without this the response could be prerendered at build time.
  await connection();

  const snapshot = await getAlertSnapshot();
  if (!snapshot) {
    return Response.json({ error: "unavailable" }, { status: 502 });
  }
  return Response.json(snapshot);
}
