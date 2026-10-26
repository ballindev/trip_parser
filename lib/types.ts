export type WriteStatus = "미작성" | "작성중" | "완료";

/** 08:00 이전 근무 시 오전 구간 청구 방식 */
export type MorningClaim = "overtime" | "breakfast";

export type DailyWorkHours = {
  date: string;
  /** `HH:mm` */
  startTime: string;
  /** `HH:mm` */
  endTime: string;
  /** startTime~endTime으로 계산된 근무시간(시간) */
  hours: number;
  /**
   * 평일 08:00 이전 근무 시 필수(시간외수당 | 조식 택1).
   * 주말·공휴일은 사용하지 않음(조식은 09:00 포함 시 자동, 시간외는 별도).
   * - overtime: 평일 시간외수당(조식 식비 제외)
   * - breakfast: 평일 조식 선택
   */
  morningClaim?: MorningClaim | null;
};

export type DailyMeal = {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

export type TransportMode = "대중교통" | "항공편" | "자차" | "렌트";

export type CostLineItem = {
  id: string;
  /** 금액(원) */
  amount: number;
  /** 인원 */
  people: number;
  /** 회수 */
  times: number;
};

export type TransportCostItem = CostLineItem & {
  /** 빈 문자열이면 미선택(선택) */
  mode: TransportMode | "";
  /** 렌트 탑승 인원 (회사 인원 Person.id). 렌트 외 수단은 비어 있을 수 있음 */
  personIds: string[];
};

/** 숙박비: 작성자 본인 1인 고정, times = 숙박 일수 */
export type LodgingCostItem = CostLineItem;

export type ReportForm = {
  region: string;
  startDate: string;
  endDate: string;
  dailyHours: DailyWorkHours[];
  dailyMeals: DailyMeal[];
  transportItems: TransportCostItem[];
  lodgingItems: LodgingCostItem[];
};

export type EmploymentStatus = "재직" | "퇴사";

export type Person = {
  id: string;
  name: string;
  rank: string;
  department: string;
  employmentStatus: EmploymentStatus;
  /** ISO timestamptz, 퇴사 시에만 값 존재 */
  resignedAt?: string | null;
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
};

export type Participant = {
  id: string;
  personId?: string;
  name: string;
  department: string;
  status: WriteStatus;
  form: ReportForm;
};

export type Trip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  summary: string;
  participants: Participant[];
};

export type ChangeRequestCategory = "오류" | "개선";

export type ChangeRequestStatus = "접수" | "진행 중" | "반영됨" | "보류";

export type ChangeRequest = {
  id: string;
  personId: string | null;
  authorName: string;
  category: ChangeRequestCategory;
  body: string;
  status: ChangeRequestStatus;
  /** `YYYY-MM-DD`. 반영됨일 때만 값이 있습니다. */
  resolvedOn: string | null;
  createdAt: string;
};
