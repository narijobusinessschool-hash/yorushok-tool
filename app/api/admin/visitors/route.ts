import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  try {
    // リアルタイム（30分以内）
    const realtimeFrom = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count: realtimeCount } = await supabaseAdmin
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .gte("created_at", realtimeFrom);

    // 期間指定
    let query = supabaseAdmin
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view");

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { count, error } = await query;
    if (error) return NextResponse.json({ count: 0, realtime: 0 });

    return NextResponse.json({ count: count ?? 0, realtime: realtimeCount ?? 0 });
  } catch {
    return NextResponse.json({ count: 0, realtime: 0 });
  }
}
