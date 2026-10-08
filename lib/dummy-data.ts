import { calcWorkHours } from "./daily-hours";
import type { DailyWorkHours, Person, Team, Trip } from "./types";

function workDay(
  date: string,
  startTime: string,
  endTime: string,
): DailyWorkHours {
  return {
    date,
    startTime,
    endTime,
    hours: calcWorkHours(startTime, endTime),
  };
}

function emptyWorkDay(date: string): DailyWorkHours {
  return { date, startTime: "", endTime: "", hours: 0 };
}

export const DUMMY_PEOPLE: Person[] = [
  { id: "person-1", name: "김민수", department: "물류기획팀" },
  { id: "person-2", name: "이서연", department: "설비운영팀" },
  { id: "person-3", name: "박준호", department: "안전관리팀" },
  { id: "person-4", name: "최유진", department: "프로덕트팀" },
  { id: "person-5", name: "정하늘", department: "엔지니어링팀" },
  { id: "person-6", name: "한지우", department: "교육운영팀" },
  { id: "person-7", name: "오세린", department: "인사팀" },
  { id: "person-8", name: "배성훈", department: "영업지원팀" },
  { id: "person-9", name: "윤다은", department: "고객경험팀" },
  { id: "person-10", name: "강도윤", department: "물류기획팀" },
  { id: "person-11", name: "신예린", department: "설비운영팀" },
  { id: "person-12", name: "문지호", department: "엔지니어링팀" },
];

export const DUMMY_TEAMS: Team[] = [
  {
    id: "team-1",
    name: "물류 현장팀",
    memberIds: ["person-1", "person-2", "person-3", "person-10", "person-11"],
  },
  {
    id: "team-2",
    name: "R&D 미팅팀",
    memberIds: ["person-4", "person-5", "person-12"],
  },
  {
    id: "team-3",
    name: "교육 운영팀",
    memberIds: ["person-6", "person-7", "person-8", "person-9"],
  },
];

export const DUMMY_TRIPS: Trip[] = [
  {
    id: "trip-1",
    name: "부산 물류센터 점검",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    summary: "물류 자동화 설비 현황 점검 및 운영 이슈 협의",
    participants: [
      {
        id: "p-1-1",
        personId: "person-1",
        name: "김민수",
        department: "물류기획팀",
        status: "완료",
        form: {
          region: "부산광역시",
          startDate: "2026-03-10",
          endDate: "2026-03-12",
          dailyHours: [
            workDay("2026-03-10", "09:00", "17:00"),
            workDay("2026-03-11", "09:00", "17:00"),
            workDay("2026-03-12", "09:00", "13:00"),
          ],
          dailyMeals: [
            { date: "2026-03-10", breakfast: true, lunch: true, dinner: true },
            { date: "2026-03-11", breakfast: true, lunch: true, dinner: true },
            { date: "2026-03-12", breakfast: true, lunch: true, dinner: false },
          ],
          transportCost: 128000,
          lodgingCost: 180000,
        },
      },
      {
        id: "p-1-2",
        personId: "person-2",
        name: "이서연",
        department: "설비운영팀",
        status: "작성중",
        form: {
          region: "부산광역시",
          startDate: "2026-03-10",
          endDate: "2026-03-12",
          dailyHours: [
            workDay("2026-03-10", "09:00", "17:00"),
            workDay("2026-03-11", "09:00", "16:00"),
            emptyWorkDay("2026-03-12"),
          ],
          dailyMeals: [
            { date: "2026-03-10", breakfast: false, lunch: true, dinner: true },
            { date: "2026-03-11", breakfast: true, lunch: true, dinner: false },
            { date: "2026-03-12", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 45000,
          lodgingCost: 90000,
        },
      },
      {
        id: "p-1-3",
        personId: "person-3",
        name: "박준호",
        department: "안전관리팀",
        status: "미작성",
        form: {
          region: "",
          startDate: "2026-03-10",
          endDate: "2026-03-12",
          dailyHours: [
            emptyWorkDay("2026-03-10"),
            emptyWorkDay("2026-03-11"),
            emptyWorkDay("2026-03-12"),
          ],
          dailyMeals: [
            { date: "2026-03-10", breakfast: false, lunch: false, dinner: false },
            { date: "2026-03-11", breakfast: false, lunch: false, dinner: false },
            { date: "2026-03-12", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 0,
          lodgingCost: 0,
        },
      },
    ],
  },
  {
    id: "trip-2",
    name: "대전 R&D 미팅",
    startDate: "2026-03-18",
    endDate: "2026-03-19",
    summary: "신규 서비스 기술 검토 및 파트너사 미팅",
    participants: [
      {
        id: "p-2-1",
        name: "최유진",
        department: "프로덕트팀",
        status: "작성중",
        form: {
          region: "대전광역시",
          startDate: "2026-03-18",
          endDate: "2026-03-19",
          dailyHours: [
            workDay("2026-03-18", "09:00", "18:00"),
            workDay("2026-03-19", "09:00", "15:00"),
          ],
          dailyMeals: [
            { date: "2026-03-18", breakfast: false, lunch: false, dinner: false },
            { date: "2026-03-19", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 62000,
          lodgingCost: 110000,
        },
      },
      {
        id: "p-2-2",
        name: "정하늘",
        department: "엔지니어링팀",
        status: "미작성",
        form: {
          region: "",
          startDate: "2026-03-18",
          endDate: "2026-03-19",
          dailyHours: [
            emptyWorkDay("2026-03-18"),
            emptyWorkDay("2026-03-19"),
          ],
          dailyMeals: [
            { date: "2026-03-18", breakfast: false, lunch: false, dinner: false },
            { date: "2026-03-19", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 0,
          lodgingCost: 0,
        },
      },
    ],
  },
  {
    id: "trip-3",
    name: "제주 현장 교육",
    startDate: "2026-04-02",
    endDate: "2026-04-04",
    summary: "지점 직원 대상 업무 프로세스 교육",
    participants: [
      {
        id: "p-3-1",
        name: "한지우",
        department: "교육운영팀",
        status: "완료",
        form: {
          region: "제주특별자치도",
          startDate: "2026-04-02",
          endDate: "2026-04-04",
          dailyHours: [
            workDay("2026-04-02", "09:00", "17:00"),
            workDay("2026-04-03", "09:00", "17:00"),
            workDay("2026-04-04", "09:00", "14:00"),
          ],
          dailyMeals: [
            { date: "2026-04-02", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-03", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-04", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 210000,
          lodgingCost: 240000,
        },
      },
      {
        id: "p-3-2",
        name: "오세린",
        department: "인사팀",
        status: "작성중",
        form: {
          region: "제주특별자치도",
          startDate: "2026-04-02",
          endDate: "2026-04-04",
          dailyHours: [
            workDay("2026-04-02", "09:00", "17:00"),
            workDay("2026-04-03", "09:00", "17:00"),
            emptyWorkDay("2026-04-04"),
          ],
          dailyMeals: [
            { date: "2026-04-02", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-03", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-04", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 0,
          lodgingCost: 240000,
        },
      },
      {
        id: "p-3-3",
        name: "배성훈",
        department: "영업지원팀",
        status: "미작성",
        form: {
          region: "",
          startDate: "2026-04-02",
          endDate: "2026-04-04",
          dailyHours: [
            emptyWorkDay("2026-04-02"),
            emptyWorkDay("2026-04-03"),
            emptyWorkDay("2026-04-04"),
          ],
          dailyMeals: [
            { date: "2026-04-02", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-03", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-04", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 0,
          lodgingCost: 0,
        },
      },
      {
        id: "p-3-4",
        name: "윤다은",
        department: "고객경험팀",
        status: "미작성",
        form: {
          region: "",
          startDate: "2026-04-02",
          endDate: "2026-04-04",
          dailyHours: [
            emptyWorkDay("2026-04-02"),
            emptyWorkDay("2026-04-03"),
            emptyWorkDay("2026-04-04"),
          ],
          dailyMeals: [
            { date: "2026-04-02", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-03", breakfast: false, lunch: false, dinner: false },
            { date: "2026-04-04", breakfast: false, lunch: false, dinner: false },
          ],
          transportCost: 0,
          lodgingCost: 0,
        },
      },
    ],
  },
];
