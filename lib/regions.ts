/** 출장 지역: 관내(서울) / 관외 */
export const REGION_LOCAL = "관내(서울)";
export const REGION_REMOTE = "관외";

export const REGIONS = [REGION_LOCAL, REGION_REMOTE] as const;

export type Region = (typeof REGIONS)[number];

/** 예전 광역자치단체 값을 관내/관외로 정규화합니다. */
export function normalizeRegion(region: string): string {
  const trimmed = region.trim();
  if (!trimmed) return "";
  if (trimmed === REGION_LOCAL || trimmed === REGION_REMOTE) return trimmed;
  if (trimmed === "서울특별시") return REGION_LOCAL;
  return REGION_REMOTE;
}
