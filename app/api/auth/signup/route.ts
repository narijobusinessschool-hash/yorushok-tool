import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

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
        usage_limit: 3,
        usage_permission: true,
        note: "",
      })
      .select()
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: "登録に失敗しました。もう一度お試しください。" }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: data.id, name: data.name ?? "", email: data.email, role: data.role },
    });
  } catch {
    return NextResponse.json({ error: "登録処理中にエラーが発生しました。" }, { status: 500 });
  }
}
