import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 有効なバナーのみ取得（ユーザー向け）
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("id, image_url, link_url, title")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ banners: [] });
  }
  return NextResponse.json({ banners: data ?? [] });
}
