import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // DB接続チェック
  let dbOk = false;
  try {
    const { error } = await supabaseAdmin.from("members").select("id", { head: true, count: "exact" });
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  // OpenAI APIキー存在チェック
  const openaiOk = !!process.env.OPENAI_API_KEY;

  // Resend APIキー存在チェック
  const resendOk = !!process.env.RESEND_API_KEY;

  return NextResponse.json({ dbOk, openaiOk, resendOk });
}
