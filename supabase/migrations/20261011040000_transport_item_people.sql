create table if not exists transport_item_people (
  transport_item_id uuid not null references transport_items (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  primary key (transport_item_id, person_id)
);

alter table transport_item_people enable row level security;

create policy "dev_all_transport_item_people"
  on transport_item_people for all using (true) with check (true);

comment on table transport_item_people is
  '렌트 등 교통비 행의 탑승 인원 (일비 반액 판정에 사용)';
