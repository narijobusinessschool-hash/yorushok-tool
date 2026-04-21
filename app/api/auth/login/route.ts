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

    // 入力値の正規化
    // - email: 大小区別なし扱いにするため lowercase 統一 + trim
    // - password: コピペ末尾スペース・全角スペース・改行による誤一致失敗を防止
    const emailNorm = email.trim().toLowerCase();
    const passwordNorm = password.replace(/[\s　]+$/u, "").replace(/^[\s　]+/u, "");

    // メアド検索: 旧データに大文字混在が残っていてもヒットさせる
    let { data, error } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("email", emailNorm)
      .maybeSingle();

    if (!data) {
      // フォールバック: DB に大文字残存している場合に ilike で完全一致検索
      const { data: alt } = await supabaseAdmin
        .from("members")
        .select("*")
        .ilike("email", emailNorm)
        .maybeSingle();
      data = alt ?? null;
      error = null;
    }

    if (error || !data) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが違います。" }, { status: 401 });
    }

    // bcryptハッシュか平文かを判定して認証
    let passwordMatch = false;
    const isHashed = data.password?.startsWith("$2b$") || data.password?.startsWith("$2a$");

    if (isHashed) {
      // 正規化版で先に試行 → 失敗時は生入力でも試行（旧データ救済）
      passwordMatch = await bcrypt.compare(passwordNorm, data.password);
      if (!passwordMatch && passwordNorm !== password) {
        passwordMatch = await bcrypt.compare(password, data.password);
      }
    } else {
      // 平文比較（既存ユーザー移行用）。正規化版・生版どちらでも一致を許容
      passwordMatch = data.password === passwordNorm || data.password === password;
      if (passwordMatch) {
        // 平文を bcrypt ハッシュへ移行（以後 bcrypt.compare で判定）
        const hashed = await bcrypt.hash(passwordNorm, 12);
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
