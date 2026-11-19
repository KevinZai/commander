import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminOrNull } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
/** One counted click per (creator, visitor IP hash) per window. */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Record one /r/{slug} visit. Persists through the service-role client only:
 * anon has no access to creators, creator_clicks or increment_creator_clicks
 * (migration 004). The visitor IP is stored only as a salted SHA-256 and is
 * never logged. Answers 503 when Supabase or CREATOR_CLICK_IP_SALT is unset.
 * The route is unauthenticated, so a repeat visit from the same IP hash to
 * the same creator within DEDUPE_WINDOW_MS is acknowledged but not stored or
 * counted; that bounds the rows one client can add to one per creator a day.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const salt = process.env.CREATOR_CLICK_IP_SALT ?? "";
  const supabase = supabaseAdminOrNull();
  if (!supabase || salt.length < 16) {
    return NextResponse.json({ error: "Click tracking is not configured" }, { status: 503 });
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex");

  try {
    const { data: creator, error: lookupError } = await supabase
      .from("creators")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (lookupError) throw new Error(`creator lookup failed (${lookupError.code ?? "unknown"})`);
    if (!creator) {
      return NextResponse.json({ error: "Unknown creator" }, { status: 404 });
    }

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: recent, error: recentError } = await supabase
      .from("creator_clicks")
      .select("id")
      .eq("creator_id", creator.id)
      .eq("ip_hash", ipHash)
      .gte("ts", since)
      .limit(1);
    if (recentError) throw new Error(`click dedupe lookup failed (${recentError.code ?? "unknown"})`);
    if (recent && recent.length > 0) {
      return NextResponse.json({ ok: true, counted: false });
    }

    const { error: insertError } = await supabase.from("creator_clicks").insert({
      creator_id: creator.id,
      ip_hash: ipHash,
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 256),
      referer: (req.headers.get("referer") ?? "").slice(0, 512),
    });
    if (insertError) throw new Error(`click insert failed (${insertError.code ?? "unknown"})`);

    const { error: rpcError } = await supabase.rpc("increment_creator_clicks", { p_slug: slug });
    if (rpcError) throw new Error(`click counter failed (${rpcError.code ?? "unknown"})`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "creator click failed");
    return NextResponse.json({ error: "Click not recorded" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counted: true });
}
