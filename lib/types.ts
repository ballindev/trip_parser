export type WriteStatus = "미작성" | "작성중" | "완료";

export type DailyWorkHours = {
  date: string;
  hours: number;
};

export type ReportForm = {
  location: string;
  startDate: string;
  endDate: string;
  dailyHours: DailyWorkHours[];
  usePrivateCar: boolean;
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
