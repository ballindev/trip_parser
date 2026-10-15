/**
 * 지역 도메인 (관내/관외 식별).
 *
 * - 여기: `REGION_*`, `normalizeRegion`, `isLocalRegion`
 * - 단가·한도 계산: `@/lib/attachment-rates` (`dailyAllowanceForDay`, `lodgingCapForRegion` …)
 *   → rates 모듈이 `isLocalRegion`을 내부에서 쓰더라도, UI/검증은 이 파일에서 import 하세요.
 */
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

/** 관내(서울) 여부. 정규화 후 `REGION_LOCAL`과 비교합니다. */
export function isLocalRegion(region: string): boolean {
  return normalizeRegion(region) === REGION_LOCAL;
}
