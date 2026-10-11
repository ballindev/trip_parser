alter table trip_participants
  add column if not exists sort_order integer not null default 0;

-- 기존 데이터는 출장별 생성 시각 순으로 정렬 번호를 부여합니다.
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

comment on column trip_participants.sort_order is
  '출장 내 참여자 표시·붙임 자료 이름 순서 (0부터)';
