-- Persist display order for teams and team members

alter table teams
  add column if not exists sort_order integer not null default 0;

alter table team_members
  add column if not exists sort_order integer not null default 0;

with ordered_teams as (
  select id, (row_number() over (order by name, created_at) - 1) as rn
  from teams
)
update teams
set sort_order = ordered_teams.rn
from ordered_teams
where teams.id = ordered_teams.id;

with ordered_members as (
  select
    team_id,
    person_id,
    (row_number() over (partition by team_id order by person_id) - 1) as rn
  from team_members
)
update team_members
set sort_order = ordered_members.rn
from ordered_members
where team_members.team_id = ordered_members.team_id
  and team_members.person_id = ordered_members.person_id;

create index if not exists teams_sort_order_idx on teams (sort_order);
create index if not exists team_members_team_id_sort_order_idx
  on team_members (team_id, sort_order);
