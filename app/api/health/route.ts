import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/auth/supabase-config";

export const dynamic = "force-dynamic";

async function probe(url: URL, publishableKey: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      apikey: publishableKey,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(3_500),
  });

  return response.ok;
}

export async function GET() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return NextResponse.json(
      { status: "degraded", checks: { auth: "unavailable", database: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [authReady, databaseReady] = await Promise.all([
      probe(new URL("/auth/v1/health", config.url), config.publishableKey),
      probe(new URL("/rest/v1/rpc/ksolar_healthcheck", config.url), config.publishableKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    ]);
    const healthy = authReady && databaseReady;

    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        checks: {
          auth: authReady ? "ok" : "unavailable",
          database: databaseReady ? "ok" : "unavailable",
        },
      },
      {
        status: healthy ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", checks: { auth: "unavailable", database: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
