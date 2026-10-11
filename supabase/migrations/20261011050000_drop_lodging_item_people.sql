-- 숙박비는 작성자 본인 1인만 계산하므로 인원 연결 테이블을 제거합니다.
drop policy if exists "dev_all_lodging_item_people" on lodging_item_people;
drop table if exists lodging_item_people;
