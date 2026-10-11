import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다.");
  }
  return url;
}

function getSupabaseKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error(
      "Supabase 키가 없습니다. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 또는 SUPABASE_SERVICE_ROLE_KEY 를 설정해 주세요.",
    );
  }
  return key;
}

let cached: SupabaseClient | null = null;

/** 서버(API Route) 전용 Supabase 클라이언트 */
export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
