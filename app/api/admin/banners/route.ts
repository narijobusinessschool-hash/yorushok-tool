import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// バナー一覧取得
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ banners: data ?? [] });
}

// バナー新規追加
export async function POST(req: NextRequest) {
  // 既存件数チェック（10件まで）
  const { count } = await supabaseAdmin
    .from("banners")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: "バナーは最大10件までです" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { title, image_url, link_url } = body;

  if (!image_url) {
    return NextResponse.json(
      { error: "画像URLは必須です" },
      { status: 400 }
    );
  }

  // sort_order は既存の最大値 + 1
  const { data: maxRow } = await supabaseAdmin
    .from("banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabaseAdmin.from("banners").insert({
    title: title || "",
    image_url,
    link_url: link_url || "",
    sort_order: nextOrder,
    is_active: true,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ banner: data });
}

// バナー更新（一括並び替え or 個別更新）
export async function PUT(req: NextRequest) {
  const body = await req.json();

  // 一括並び替え
  if (body.reorder && Array.isArray(body.ids)) {
    const ids: string[] = body.ids;
    const promises = ids.map((id, i) =>
      supabaseAdmin.from("banners").update({ sort_order: i, updated_at: new Date().toISOString() }).eq("id", id)
    );
    await Promise.all(promises);
    return NextResponse.json({ ok: true });
  }

  // 個別更新
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ error: "idは必須です" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if ("title" in updates) allowed.title = updates.title;
  if ("image_url" in updates) allowed.image_url = updates.image_url;
  if ("link_url" in updates) allowed.link_url = updates.link_url;
  if ("is_active" in updates) allowed.is_active = updates.is_active;
  allowed.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("banners")
    .update(allowed)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// バナー削除
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "idは必須です" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("banners").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
