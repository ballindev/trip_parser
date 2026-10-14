-- trip_parser initial schema

create extension if not exists "pgcrypto";

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rank text not null default '',
  department text not null default '',
  employment_status text not null default '재직'
    check (employment_status in ('재직', '퇴사')),
  resigned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id uuid not null references teams (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  primary key (team_id, person_id)
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists trip_participants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  person_id uuid references people (id) on delete set null,
  name text not null,
  department text not null default '',
  status text not null default '미작성'
    check (status in ('미작성', '작성중', '완료')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trip_participants_trip_id_idx
  on trip_participants (trip_id);

create index if not exists trip_participants_trip_id_sort_order_idx
  on trip_participants (trip_id, sort_order);

create table if not exists participant_reports (
  participant_id uuid primary key references trip_participants (id) on delete cascade,
  region text not null default '',
  start_date date,
  end_date date,
  updated_at timestamptz not null default now()
);

create table if not exists daily_work_hours (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references trip_participants (id) on delete cascade,
  work_date date not null,
  start_time text not null default '',
  end_time text not null default '',
  hours numeric(8, 2) not null default 0,
  morning_claim text,
  unique (participant_id, work_date)
);

create table if not exists daily_meals (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references trip_participants (id) on delete cascade,
  meal_date date not null,
  breakfast boolean not null default false,
  lunch boolean not null default false,
  dinner boolean not null default false,
  unique (participant_id, meal_date)
);

create table if not exists transport_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references trip_participants (id) on delete cascade,
  mode text not null default '',
  amount integer not null default 0,
  people integer not null default 0,
  times integer not null default 0,
  sort_order integer not null default 0
);

create index if not exists transport_items_participant_id_idx
  on transport_items (participant_id);

create table if not exists lodging_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references trip_participants (id) on delete cascade,
  amount integer not null default 0,
  people integer not null default 1,
  times integer not null default 0,
  sort_order integer not null default 0
);

create index if not exists lodging_items_participant_id_idx
  on lodging_items (participant_id);

create table if not exists transport_item_people (
  transport_item_id uuid not null references transport_items (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  primary key (transport_item_id, person_id)
);

-- Dev-friendly RLS: allow all via anon/publishable key until auth is added
alter table people enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table trips enable row level security;
alter table trip_participants enable row level security;
alter table participant_reports enable row level security;
alter table daily_work_hours enable row level security;
alter table daily_meals enable row level security;
alter table transport_items enable row level security;
alter table lodging_items enable row level security;
alter table transport_item_people enable row level security;

create policy "dev_all_people" on people for all using (true) with check (true);
create policy "dev_all_teams" on teams for all using (true) with check (true);
create policy "dev_all_team_members" on team_members for all using (true) with check (true);
create policy "dev_all_trips" on trips for all using (true) with check (true);
create policy "dev_all_trip_participants" on trip_participants for all using (true) with check (true);
create policy "dev_all_participant_reports" on participant_reports for all using (true) with check (true);
create policy "dev_all_daily_work_hours" on daily_work_hours for all using (true) with check (true);
create policy "dev_all_daily_meals" on daily_meals for all using (true) with check (true);
create policy "dev_all_transport_items" on transport_items for all using (true) with check (true);
create policy "dev_all_lodging_items" on lodging_items for all using (true) with check (true);
create policy "dev_all_transport_item_people" on transport_item_people for all using (true) with check (true);
-- 시드 데이터 없음: 테이블만 비움
truncate table
  transport_item_people,
  lodging_items,
  transport_items,
  daily_meals,
  daily_work_hours,
  participant_reports,
  trip_participants,
  trips,
  team_members,
  teams,
  people
restart identity cascade;

-- 기존 DB에 people 테이블만 있는 경우 컬럼 보강
alter table people
  add column if not exists employment_status text not null default '재직';

alter table people
  add column if not exists resigned_at timestamptz;

alter table daily_work_hours
  add column if not exists morning_claim text;

alter table trip_participants
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by trip_id
      order by created_at asc, id asc
    ) - 1 as next_order
  from trip_participants
)
update trip_participants as tp
set sort_order = ranked.next_order
from ranked
where tp.id = ranked.id;

create index if not exists trip_participants_trip_id_sort_order_idx
  on trip_participants (trip_id, sort_order);

create table if not exists transport_item_people (
  transport_item_id uuid not null references transport_items (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  primary key (transport_item_id, person_id)
);

alter table transport_item_people enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'transport_item_people'
      and policyname = 'dev_all_transport_item_people'
  ) then
    create policy "dev_all_transport_item_people"
      on transport_item_people for all using (true) with check (true);
  end if;
end $$;

create index if not exists people_employment_status_idx
  on people (employment_status);

-- 전체 인원 목록 표시 순서
alter table people
  add column if not exists sort_order integer not null default 0;

with ordered_people as (
  select id, row_number() over (order by name asc, id asc) - 1 as rn
  from people
)
update people
set sort_order = ordered_people.rn
from ordered_people
where people.id = ordered_people.id;

create index if not exists people_sort_order_idx on people (sort_order);

-- 숙박비 인원 연결 테이블 제거 (본인 1인 고정)
drop policy if exists "dev_all_lodging_item_people" on lodging_item_people;
drop table if exists lodging_item_people;
