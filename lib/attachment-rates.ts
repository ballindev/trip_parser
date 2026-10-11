import { REGION_LOCAL, normalizeRegion } from "@/lib/regions";

/** 출장복명서 붙임 자료 단가·한도 (원) */

export const MEAL_UNIT_RATE = 8_300;

/**
 * 지급 식사 수 → 1인 식비
 * - 1식(조식 또는 중식 등) 8,300
 * - 2식 16,600
 * - 3식(조·중·석) 25,000
 *
 * 시간외수당 선택 시 조식은 제외되고 중식/석식만 집계됩니다.
 */
export function mealPayByCount(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 8_300;
  if (count === 2) return 16_600;
  return 25_000;
}

/**
 * 일비 (하루 단위, 근무 4시간 기준)
 * - 관외: 4시간 이상 25,000 / 미만 12,500
 * - 관내(서울): 4시간 이상 20,000 / 미만 10,000
 */
export const DAILY_ALLOWANCE = {
  local: { full: 20_000, half: 10_000 },
  remote: { full: 25_000, half: 12_500 },
} as const;

/** 숙박비 1인 1일 한도 */
export const LODGING_CAP = {
  seoul: 100_000,
  metro: 80_000,
  other: 70_000,
} as const;

/** 예전 광역 표기용 (정규화 전 데이터) */
const LEGACY_METRO_REGIONS = new Set([
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
]);

export function isLocalRegion(region: string): boolean {
  return normalizeRegion(region) === REGION_LOCAL;
}

export function lodgingCapForRegion(region: string): number {
  if (isLocalRegion(region)) return LODGING_CAP.seoul;
  if (LEGACY_METRO_REGIONS.has(region.trim())) return LODGING_CAP.metro;
  return LODGING_CAP.other;
}

export function dailyAllowanceForDay(input: {
  region: string;
  hours: number;
  rentHalf: boolean;
}): number {
  const local = isLocalRegion(input.region);
  const bracket = local ? DAILY_ALLOWANCE.local : DAILY_ALLOWANCE.remote;
  const base = input.hours >= 4 ? bracket.full : bracket.half;
  return input.rentHalf ? Math.floor(base / 2) : base;
}
