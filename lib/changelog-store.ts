import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChangelogItem } from "@/lib/changelog";

const FILE_PATH = path.join(process.cwd(), "content", "changelog.json");

let writeQueue = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function readChangelogItems(): Promise<ChangelogItem[]> {
  const raw = await readFile(FILE_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return normalizeChangelogItems(parsed.filter(isRawChangelogItem));
}

async function writeChangelogItems(items: ChangelogItem[]) {
  const temporary = `${FILE_PATH}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await rename(temporary, FILE_PATH);
}

type RawChangelogItem = {
  id: string;
  date: string;
  body: string;
  sortOrder?: number;
  createdAt?: string;
};

function isRawChangelogItem(value: unknown): value is RawChangelogItem {
  if (!value || typeof value !== "object") return false;
  const item = value as RawChangelogItem;
  return (
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.body === "string"
  );
}

function normalizeChangelogItems(rows: RawChangelogItem[]): ChangelogItem[] {
  const legacy = rows.some((row) => typeof row.sortOrder === "number");
  if (!legacy) {
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      body: row.body,
      createdAt: row.createdAt,
    }));
  }

  const groups = new Map<string, RawChangelogItem[]>();
  for (const row of rows) {
    const list = groups.get(row.date) ?? [];
    list.push(row);
    groups.set(row.date, list);
  }

  return [...groups.entries()].map(([date, group]) => {
    group.sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
    return {
      id: group[0].id,
      date,
      body: group
        .map((item) => item.body.trim())
        .filter(Boolean)
        .join("\n"),
      createdAt: group[0].createdAt,
    };
  });
}

export function createChangelogItem(input: {
  date: string;
  body: string;
}): ChangelogItem {
  return {
    id: randomUUID(),
    date: input.date,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
}

export async function addChangelogItem(input: {
  date: string;
  body: string;
}): Promise<ChangelogItem> {
  return withLock(async () => {
    const items = await readChangelogItems();
    const created = createChangelogItem(input);
    await writeChangelogItems([...items, created]);
    return created;
  });
}

export async function updateChangelogItem(
  id: string,
  input: { date: string; body: string },
): Promise<ChangelogItem | null> {
  return withLock(async () => {
    const items = await readChangelogItems();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = items[index];
    const next = { ...current, date: input.date, body: input.body };
    const copy = items.slice();
    copy[index] = next;
    await writeChangelogItems(copy);
    return next;
  });
}

export async function deleteChangelogItem(id: string): Promise<boolean> {
  return withLock(async () => {
    const items = await readChangelogItems();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    await writeChangelogItems(next);
    return true;
  });
}
