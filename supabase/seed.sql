-- 모든 업무 데이터 초기화 (더미/시드 데이터 없음)

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
