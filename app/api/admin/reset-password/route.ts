// 管理者によるパスワード再発行API
// ランダム10桁の仮パスワードを生成 → bcrypt ハッシュで members.password を上書き
// 平文は1回だけレスポンスで返却し、DB には保存しない（管理者が本人へ別経路で伝達）
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generateTempPassword(length = 10): string {
  // 紛らわしい文字（0/O, 1/l/I）を除外
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(randomInt(0, chars.length));
  }
  return password;
}

export async function POST(req: Request) {
  try {
    const { memberId, memberEmail } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const idNum = Number(memberId);

    const { data: target } = await supabaseAdmin
      .from("members")
      .select("id, email, role")
      .eq("id", idNum)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "member not found" }, { status: 404 });
    }

    const newPassword = generateTempPassword();
    const hashed = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({ password: hashed })
      .eq("id", idNum);

    if (updateError) {
      return NextResponse.json(
        { error: `更新に失敗しました: ${updateError.message}` },
        { status: 500 },
      );
    }

    await supabaseAdmin.from("usage_events").insert({
      event_type: "admin_log",
      user_id: null,
      meta: {
        action: "password_reset",
        targetMemberId: String(idNum),
        targetEmail: memberEmail ?? target.email,
      },
    });

    return NextResponse.json({ ok: true, newPassword });
  } catch (err) {
    return NextResponse.json(
      { error: `処理中にエラーが発生しました: ${String(err)}` },
      { status: 500 },
    );
  }
}
