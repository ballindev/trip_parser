import { randomUUID } from "node:crypto";
import type { ChangelogItem } from "@/lib/changelog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type DbChangelogItem = {
  id: string;
  date: string;
  body: string;
  created_at: string;
};

function mapChangelogItem(row: DbChangelogItem): ChangelogItem {
  return {
    id: row.id,
    date: row.date.slice(0, 10),
    body: row.body,
    createdAt: row.created_at,
  };
}

export function changelogDbError(message: string): string {
  if (message.includes("changelog_items") || message.includes("schema cache")) {
    return "적용 내용 저장소가 아직 없습니다. Supabase SQL Editor에서 supabase/migrations/20261027010000_changelog_items.sql 을 실행해 주세요.";
  }
  return message;
}

async function readRows(): Promise<ChangelogItem[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("changelog_items")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(changelogDbError(error.message));
  return (data as DbChangelogItem[]).map(mapChangelogItem);
}

export async function readChangelogItems(): Promise<ChangelogItem[]> {
  return readRows();
}

export async function addChangelogItem(input: {
  date: string;
  body: string;
}): Promise<ChangelogItem> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("changelog_items")
    .insert({
      id: randomUUID(),
      date: input.date,
      body: input.body,
    })
    .select("*")
    .single();

  if (error) throw new Error(changelogDbError(error.message));
  return mapChangelogItem(data as DbChangelogItem);
}

export async function updateChangelogItem(
  id: string,
  input: { date: string; body: string },
): Promise<ChangelogItem | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("changelog_items")
    .update({ date: input.date, body: input.body })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(changelogDbError(error.message));
  if (!data) return null;
  return mapChangelogItem(data as DbChangelogItem);
}

export async function deleteChangelogItem(id: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("changelog_items")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) throw new Error(changelogDbError(error.message));
  return (data?.length ?? 0) > 0;
}
