import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";
import { OutingRequestSchema } from "@/lib/outings/domain";
import { planOuting } from "@/lib/outings/plan";
import { OutingProviderError } from "@/lib/outings/providers";
import { log } from "@/lib/logger";
import { isSameOriginRequest } from "@/lib/outings/http";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
const limiter = new FixedWindowRateLimiter({ limit: 8, windowMs: 10 * 60_000 });
const globalLimiter = new FixedWindowRateLimiter({
  limit: 160,
  windowMs: 60 * 60_000,
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request))
    return NextResponse.json(
      { error: "Please open Wanderfound to make this request." },
      { status: 403 },
    );
  const body = await request.text();
  if (body.length > 18000)
    return NextResponse.json(
      { error: "Please shorten your request." },
      { status: 413 },
    );
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Please send a valid outing request." },
      { status: 400 },
    );
  }
  const parsed = OutingRequestSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Add your Goa area and a short description of what you’d like to do.",
      },
      { status: 400 },
    );
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const key = createHash("sha256").update(ip).digest("hex");
  if (!limiter.check(key).allowed || !globalLimiter.check("all").allowed)
    return NextResponse.json(
      {
        error:
          "You’ve made a few requests. Give it a little time and try again.",
      },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  const started = Date.now();
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const signal = AbortSignal.any([
    request.signal,
    abort.signal,
    AbortSignal.timeout(57000),
  ]);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        if (!abort.signal.aborted)
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const result = await planOuting(
          parsed.data,
          (stage) => send({ type: "progress", stage }),
          signal,
        );
        send({ type: "result", result });
        log("info", "outing_generated", {
          outing_id: result.id,
          option_count: result.options.length,
          duration_ms: Date.now() - started,
          revision: parsed.data.history.length > 0,
        });
      } catch (error) {
        log("error", "outing_generation_failed", {
          kind: error instanceof Error ? error.name : "unknown",
          duration_ms: Date.now() - started,
        });
        send({
          type: "error",
          error:
            error instanceof OutingProviderError
              ? error.message
              : "Research took longer than expected or a source couldn’t be reached. Your request is saved—please try again.",
        });
      } finally {
        if (!abort.signal.aborted) controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
