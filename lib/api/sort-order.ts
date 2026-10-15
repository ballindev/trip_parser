import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 같은 테이블의 여러 행 sort_order를 순차로 갱신합니다.
 * Promise.all 병렬 UPDATE는 Postgres row-lock 교차로 deadlock(40P01)을 유발할 수 있습니다.
 */
export async function updateSortOrdersSequentially(
  supabase: SupabaseClient,
  table: string,
  orderedIds: string[],
  options?: {
    idColumn?: string;
    /** 추가 eq 필터 (예: trip_id) */
    eq?: Record<string, string>;
  },
): Promise<{ error: { message: string } | null }> {
  const idColumn = options?.idColumn ?? "id";

  for (let index = 0; index < orderedIds.length; index += 1) {
    let query = supabase
      .from(table)
      .update({ sort_order: index })
      .eq(idColumn, orderedIds[index]);

    if (options?.eq) {
      for (const [column, value] of Object.entries(options.eq)) {
        query = query.eq(column, value);
      }
    }

    const { error } = await query;
    if (error) return { error };
  }

  return { error: null };
}
