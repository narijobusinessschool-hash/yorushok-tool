import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password, deviceFingerprint } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードを入力してください。" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("email", email.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが違います。" }, { status: 401 });
    }

    // bcryptハッシュか平文かを判定して認証
    let passwordMatch = false;
    const isHashed = data.password?.startsWith("$2b$") || data.password?.startsWith("$2a$");

    if (isHashed) {
      passwordMatch = await bcrypt.compare(password, data.password);
    } else {
      // 平文比較（既存ユーザー移行用）
      passwordMatch = data.password === password;
      if (passwordMatch) {
        // 平文パスワードをハッシュ化してDBを更新（自動移行）
        const hashed = await bcrypt.hash(password, 12);
        await supabaseAdmin
          .from("members")
          .update({ password: hashed })
          .eq("id", data.id);
      }
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが違います。" }, { status: 401 });
    }

    if (data.status === "停止中") {
      return NextResponse.json({ error: "このアカウントは現在利用停止中です。管理者にお問い合わせください。" }, { status: 403 });
    }
    if (data.status === "解約") {
      return NextResponse.json({ error: "このアカウントは解約済みです。管理者にお問い合わせください。" }, { status: 403 });
    }
    if (data.usage_permission === false) {
      return NextResponse.json({ error: "現在このアカウントの利用が制限されています。管理者にお問い合わせください。" }, { status: 403 });
    }

    // メール認証未完了の場合はログイン拒否（既存ユーザーは email_verified=true で初期化済なので影響なし）
    if (data.email_verified === false) {
      return NextResponse.json(
        {
          error: "email_not_verified",
          message:
            "メールアドレスの確認が完了していません。登録時にお送りした確認メールのリンクをクリックしてください。",
          email: data.email,
        },
        { status: 403 },
      );
    }

    // 端末指紋の最新化: ログインした端末の指紋を常に反映する
    // - 初回ログイン: NULL → 現在の端末指紋を保存（旧バックフィル動作）
    // - 別端末でログイン: 保存済 ≠ 現在 → 上書き（過去の端末情報は自動で消える）
    // - 同じ端末で再ログイン: 同一値なので書き込み不要（無駄な更新を避ける）
    if (
      deviceFingerprint &&
      typeof deviceFingerprint === "string" &&
      deviceFingerprint.trim().length > 0 &&
      data.device_fingerprint !== deviceFingerprint
    ) {
      await supabaseAdmin
        .from("members")
        .update({ device_fingerprint: deviceFingerprint })
        .eq("id", data.id);
    }

    return NextResponse.json({
      user: { id: data.id, name: data.name ?? "", email: data.email, role: data.role, plan: data.plan ?? "free" },
    });
  } catch {
    return NextResponse.json({ error: "ログイン処理中にエラーが発生しました。" }, { status: 500 });
  }
}
