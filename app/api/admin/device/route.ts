import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabaseAdmin
    .from("members")
    .select("id, name, email, plan, status, device_status, last_login_at, created_at")
    .neq("role", "管理者")
    .order("created_at", { ascending: false });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { memberId, memberName, action } = await req.json();

  const deviceStatus = action === "reset" ? "未登録" : "再承認待ち";
  try {
    await supabaseAdmin.from("members").update({ device_status: deviceStatus }).eq("id", memberId);
  } catch { /* device_status column may not exist */ }

  await supabaseAdmin.from("usage_events").insert({
    event_type: "admin_log",
    user_id: null,
    meta: { action: `device_${action}`, targetMemberId: memberId, targetName: memberName },
  });

  return NextResponse.json({ ok: true });
}
