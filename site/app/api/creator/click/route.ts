import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { slug?: string };
  const slug = typeof body.slug === "string" ? body.slug : null;

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "";
  const referer = req.headers.get("referer") ?? "";

  // TODO: CC-665 D — INSERT INTO creator_clicks when Supabase is wired
  // await supabase.from("creator_clicks").insert({
  //   creator_slug: slug,
  //   ip_hash: hashIp(ip),
  //   user_agent: userAgent,
  //   referer,
  //   ts: new Date().toISOString(),
  // });
  console.info(`TODO: CC-665 D — click logged for creator=${slug} ip=${ip} ua=${userAgent} referer=${referer}`);

  return NextResponse.json({ ok: true });
}
