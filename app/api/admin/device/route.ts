import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabaseAdmin
    .from("members")
    .select("id, name, email, plan, status, device_status, device_fingerprint, last_login_at, created_at")
    .neq("role", "管理者")
    .order("created_at", { ascending: false });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { memberId, memberName, action, fingerprint } = body;

  // 一括リセット: 全会員の端末指紋をクリア
  if (action === "reset_all") {
    const { count } = await supabaseAdmin
      .from("members")
      .update({ device_fingerprint: null, device_status: "未登録" }, { count: "exact" })
      .not("device_fingerprint", "is", null);

    await supabaseAdmin.from("usage_events").insert({
      event_type: "admin_log",
      user_id: null,
      meta: { action: "device_reset_all", affectedCount: count ?? 0 },
    });
    return NextResponse.json({ ok: true, affectedCount: count ?? 0 });
  }

  // 指紋で解放: 特定の fingerprint 値を持つ全会員から指紋をクリア
  if (action === "release_fingerprint") {
    if (!fingerprint || typeof fingerprint !== "string") {
      return NextResponse.json(
        { error: "fingerprint is required" },
        { status: 400 },
      );
    }
    const { count } = await supabaseAdmin
      .from("members")
      .update({ device_fingerprint: null, device_status: "未登録" }, { count: "exact" })
      .eq("device_fingerprint", fingerprint);

    await supabaseAdmin.from("usage_events").insert({
      event_type: "admin_log",
      user_id: null,
      meta: {
        action: "device_release_fingerprint",
        fingerprint,
        affectedCount: count ?? 0,
      },
    });
    return NextResponse.json({ ok: true, affectedCount: count ?? 0 });
  }

  // 個別リセット・再承認要求（従来）
  const deviceStatus = action === "reset" ? "未登録" : "再承認待ち";
  try {
    const updateData: Record<string, string | null> = { device_status: deviceStatus };
    if (action === "reset") {
      updateData.device_fingerprint = null;
    }
    await supabaseAdmin.from("members").update(updateData).eq("id", memberId);
  } catch { /* device_status column may not exist */ }

  await supabaseAdmin.from("usage_events").insert({
    event_type: "admin_log",
    user_id: null,
    meta: { action: `device_${action}`, targetMemberId: memberId, targetName: memberName },
  });

  return NextResponse.json({ ok: true });
}
