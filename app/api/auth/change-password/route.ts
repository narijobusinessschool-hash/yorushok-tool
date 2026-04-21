// 会員自身によるパスワード変更API
// - 現在パスワード確認: bcrypt 済みなら compare、平文なら === で照合
// - 新パスワード: 前後空白を正規化 → bcrypt ハッシュで保存（平文保存は廃止）
// - クライアントから直接 members テーブルを書き換える経路を遮断
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalizePassword(input: string): string {
  return input.replace(/[\s　]+$/u, "").replace(/^[\s　]+/u, "");
}

export async function POST(req: Request) {
  try {
    const { memberId, currentPassword, newPassword } = await req.json();

    if (!memberId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "入力が不足しています。" },
        { status: 400 },
      );
    }

    const newNorm = normalizePassword(String(newPassword));
    if (newNorm.length < 6) {
      return NextResponse.json(
        { error: "新しいパスワードは6文字以上で入力してください。" },
        { status: 400 },
      );
    }

    const { data: member, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, password")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: "アカウント情報の取得に失敗しました。" },
        { status: 404 },
      );
    }

    // 現在パスワード確認: ハッシュなら bcrypt.compare（正規化版→生入力版）、平文なら ===
    const currentNorm = normalizePassword(String(currentPassword));
    const isHashed =
      typeof member.password === "string" &&
      (member.password.startsWith("$2b$") || member.password.startsWith("$2a$"));

    let currentMatch = false;
    if (isHashed) {
      currentMatch = await bcrypt.compare(currentNorm, member.password);
      if (!currentMatch && currentNorm !== currentPassword) {
        currentMatch = await bcrypt.compare(currentPassword, member.password);
      }
    } else {
      currentMatch =
        member.password === currentNorm || member.password === currentPassword;
    }

    if (!currentMatch) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません。" },
        { status: 401 },
      );
    }

    const hashed = await bcrypt.hash(newNorm, 12);
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({ password: hashed })
      .eq("id", memberId);

    if (updateError) {
      return NextResponse.json(
        { error: `パスワード更新に失敗しました: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: `処理中にエラーが発生しました: ${String(err)}` },
      { status: 500 },
    );
  }
}
