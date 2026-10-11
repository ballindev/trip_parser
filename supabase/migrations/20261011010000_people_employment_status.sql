-- Soft-delete / resignation support for people

alter table people
  add column if not exists employment_status text not null default '재직'
    check (employment_status in ('재직', '퇴사'));

alter table people
  add column if not exists resigned_at timestamptz;

create index if not exists people_employment_status_idx
  on people (employment_status);
