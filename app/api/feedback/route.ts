import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { memberId, draftResultId, rating, reason, eventType } = await req.json();

    if (eventType === "copy") {
      // 暗示的フィードバック: コピーイベントを記録
      await supabaseAdmin.from("usage_events").insert({
        event_type: "copy_body",
        user_id: memberId ? String(memberId) : null,
        meta: { draftResultId },
      });
      return NextResponse.json({ ok: true });
    }

    // 明示的フィードバック: 評価を記録
    await supabaseAdmin.from("usage_events").insert({
      event_type: "feedback",
      user_id: memberId ? String(memberId) : null,
      meta: { draftResultId, rating, reason: reason ?? null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
