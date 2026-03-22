import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabaseAdmin
    .from("members")
    .select("id, name, email, role, status, plan, usage_count, usage_limit, usage_permission, created_at")
    .neq("role", "管理者")
    .order("created_at", { ascending: false });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { memberId, memberName, field, value } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (field === "usage_permission") updateData.usage_permission = value;
  if (field === "status") {
    updateData.status = value;
    if (value === "契約中") updateData.usage_permission = true;
    if (value === "停止中") updateData.usage_permission = false;
  }

  await supabaseAdmin.from("members").update(updateData).eq("id", memberId);

  await supabaseAdmin.from("usage_events").insert({
    event_type: "admin_log",
    user_id: null,
    meta: { action: "permission_change", targetMemberId: memberId, targetName: memberName, field, value },
  });

  return NextResponse.json({ ok: true });
}
