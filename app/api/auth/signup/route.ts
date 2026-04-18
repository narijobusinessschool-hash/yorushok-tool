import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { notifyNewMember } from "@/lib/notify";

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
    if (password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上で設定してください。" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("email", email.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: "このメールアドレスはすでに登録されています。" }, { status: 409 });
    }

    // 端末指紋重複チェック（同一端末からの複アカ登録防止）
    if (deviceFingerprint && typeof deviceFingerprint === "string") {
      const { data: fpMatch } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("device_fingerprint", deviceFingerprint)
        .maybeSingle();

      if (fpMatch) {
        return NextResponse.json(
          {
            error: "duplicate_device",
            message:
              "この端末は既に登録されています。別のアカウントをお持ちの場合はそちらでログインしてください。心当たりがない場合は下記までお問い合わせください。",
            contactLine: "https://line.me/R/ti/p/%40201kgbng",
            contactEmail: "narijo.businessschool@gmail.com",
          },
          { status: 409 },
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data, error: insertError } = await supabaseAdmin
      .from("members")
      .insert({
        email: email.trim(),
        password: hashedPassword,
        role: "一般会員",
        status: "契約中",
        plan: "free",
        usage_count: 0,
        usage_limit: 20,
        usage_permission: true,
        note: "",
        device_fingerprint: deviceFingerprint || null,
      })
      .select()
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    notifyNewMember(email.trim(), data.id).catch(() => {});

    return NextResponse.json({
      user: { id: data.id, name: data.name ?? "", email: data.email, role: data.role },
    });
  } catch {
    return NextResponse.json({ error: "登録処理中にエラーが発生しました。" }, { status: 500 });
  }
}
