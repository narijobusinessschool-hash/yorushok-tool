import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("usage_events")
    .select("id, created_at, meta")
    .eq("event_type", "admin_reference")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { category, title, text } = body;
  if (!category || !text) {
    return NextResponse.json({ error: "category and text are required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("usage_events").insert({
    event_type: "admin_reference",
    meta: { category, title: title ?? "", body: text },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("usage_events")
    .delete()
    .eq("id", id)
    .eq("event_type", "admin_reference");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
