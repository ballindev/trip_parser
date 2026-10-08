export type WriteStatus = "미작성" | "작성중" | "완료";

export type DailyWorkHours = {
  date: string;
  /** `HH:mm` */
  startTime: string;
  /** `HH:mm` */
  endTime: string;
  /** startTime~endTime으로 계산된 근무시간(시간) */
  hours: number;
};

export type DailyMeal = {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

export type ReportForm = {
  region: string;
  startDate: string;
  endDate: string;
  dailyHours: DailyWorkHours[];
  dailyMeals: DailyMeal[];
  transportCost: number;
  lodgingCost: number;
};

export type Person = {
  id: string;
  name: string;
  department: string;
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
