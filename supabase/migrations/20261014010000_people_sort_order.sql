-- Persist global display order for people (전체 탭)
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

comment on column people.sort_order is
  '전체 인원 목록 표시 순서. 팀별 순서는 team_members.sort_order를 사용합니다.';
