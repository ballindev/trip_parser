-- 사용자가 남기는 수정 요청. 적용 내용은 이 테이블이 아니라 content/changelog.ts 에 둡니다.
create table if not exists change_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references people (id) on delete set null,
  author_name text not null,
  category text not null check (category in ('오류', '개선')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default '접수'
    check (status in ('접수', '진행 중', '반영됨', '보류')),
  resolved_on date,
  created_at timestamptz not null default now()
);

create index if not exists change_requests_created_at_idx
  on change_requests (created_at desc);

alter table change_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'change_requests'
      and policyname = 'dev_all_change_requests'
  ) then
    create policy "dev_all_change_requests"
      on change_requests for all using (true) with check (true);
  end if;
end $$;

comment on table change_requests is
  '사용자가 남긴 수정 요청. 상태는 개발자가 바꿉니다.';
