import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/inquiries         → 全件取得
// GET /api/inquiries?unread=1 → 未読件数のみ
export async function GET(req: NextRequest) {
  try {
    const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

    if (unreadOnly) {
      const { count, error } = await supabaseAdmin
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) return NextResponse.json({ count: 0 });
      return NextResponse.json({ count: count ?? 0 });
    }

    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "取得失敗" }, { status: 500 });
    }
    return NextResponse.json({ inquiries: data ?? [] });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// POST /api/inquiries { action: "markAllRead" } → 全件既読化
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    if (action === "markAllRead") {
      await supabaseAdmin
        .from("inquiries")
        .update({ is_read: true })
        .eq("is_read", false);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
