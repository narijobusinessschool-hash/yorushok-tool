import { supabase } from "./supabase";

export async function logError(
  type: string,
  message: string,
  detail?: object,
  userId?: string
) {
  try {
    await supabase.from("error_logs").insert({
      type,
      message,
      detail: detail ?? null,
      user_id: userId ?? null,
    });
  } catch {
    // ロギング自体のエラーはサイレントに無視
  }
}

export async function logEvent(
  eventType: string,
  userId?: string,
  meta?: object
) {
  try {
    await supabase.from("usage_events").insert({
      event_type: eventType,
      user_id: userId ?? null,
      meta: meta ?? null,
    });
  } catch {
    // ロギング自体のエラーはサイレントに無視
  }
}
