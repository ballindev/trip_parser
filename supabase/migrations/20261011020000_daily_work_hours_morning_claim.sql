alter table daily_work_hours
  add column if not exists morning_claim text;

comment on column daily_work_hours.morning_claim is
  'overtime | breakfast | null — 08:00 이전 근무 시 시간외/조식 선택';
