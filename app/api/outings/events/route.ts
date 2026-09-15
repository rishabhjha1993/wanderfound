import { NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { isSameOriginRequest } from "@/lib/outings/http";

const EventSchema = z
  .object({
    name: z.enum([
      "started",
      "selected",
      "navigation",
      "shared",
      "shared_opened",
      "returned",
      "went",
      "changed_plans",
      "did_not_go",
      "useful",
      "not_useful",
    ]),
    sessionId: z.string().uuid(),
    outingId: z.string().uuid().optional(),
    source: z.enum(["direct", "shared"]).default("direct"),
  })
  .strict();

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  const body = await request.text();
  if (body.length > 1000) return new Response(null, { status: 413 });
  try {
    const parsed = EventSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return new Response(null, { status: 400 });
    log("info", `outing_${parsed.data.name}`, {
      session_id: parsed.data.sessionId,
      outing_id: parsed.data.outingId,
      source: parsed.data.source,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return new Response(null, { status: 400 });
  }
}
