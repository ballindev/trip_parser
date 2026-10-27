-- 개발자 화면에서 등록하는 적용 내용. 배포 환경의 파일시스템은 읽기 전용이다.
create table if not exists changelog_items (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists changelog_items_date_idx
  on changelog_items (date desc, created_at desc);

alter table changelog_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'changelog_items'
      and policyname = 'dev_all_changelog_items'
  ) then
    create policy "dev_all_changelog_items"
      on changelog_items for all using (true) with check (true);
  end if;
end $$;

insert into changelog_items (id, date, body, created_at)
values (
  'a1111111-1111-4111-8111-111111111111',
  '2026-10-26',
  E'개발자 전용화면 추가\n출장 검색에 연도/월 조건 추가\n수정 요청 접수 화면 추가',
  '2026-10-26T00:00:00Z'
)
on conflict (id) do nothing;

comment on table changelog_items is
  '사용자에게 보이는 적용 내용. 개발자 화면에서 글을 등록하고 수정합니다.';
