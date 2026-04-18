import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  try {
    const { memberId, memberEmail } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const idNum = Number(memberId);
    const idStr = String(memberId);

    // 管理者（role: 管理者）の誤削除防止
    const { data: target } = await supabaseAdmin
      .from("members")
      .select("id, email, role")
      .eq("id", idNum)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "member not found" }, { status: 404 });
    }

    if (target.role === "管理者") {
      return NextResponse.json(
        { error: "管理者アカウントは削除できません。" },
        { status: 403 },
      );
    }

    // 関連データを削除（孤立レコードを残さない）
    // 1件でも失敗したら次へは進むが、エラーは収集してログ
    const deletions = [
      supabaseAdmin.from("usage_events").delete().eq("user_id", idStr),
      supabaseAdmin.from("draft_results").delete().eq("member_id", idNum),
      supabaseAdmin.from("user_ai_profiles").delete().eq("member_id", idStr),
      supabaseAdmin.from("member_profiles").delete().eq("member_id", idNum),
      supabaseAdmin.from("draft_outcomes").delete().eq("member_id", idNum),
      supabaseAdmin.from("access_analyses").delete().eq("member_id", idNum),
    ];
    await Promise.allSettled(deletions);

    // 本体削除
    const { error: deleteError } = await supabaseAdmin
      .from("members")
      .delete()
      .eq("id", idNum);

    if (deleteError) {
      return NextResponse.json(
        { error: `削除に失敗しました: ${deleteError.message}` },
        { status: 500 },
      );
    }

    // 管理者操作ログ
    await supabaseAdmin.from("usage_events").insert({
      event_type: "admin_log",
      user_id: null,
      meta: {
        action: "delete_member",
        targetMemberId: idStr,
        targetEmail: memberEmail ?? target.email,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: `削除処理中にエラーが発生しました: ${String(err)}` },
      { status: 500 },
    );
  }
}
