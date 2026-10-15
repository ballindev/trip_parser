# 팀 소속 · 인원 정렬 규칙

## 팀 소속 (`team_members`)

- 사람은 **최대 1개 팀**에만 소속됩니다 (`person_id` 기준 멤버십 1건).
- **팀 변경 없음**(같은 `teamId`로 PATCH) → `team_members` 행을 건드리지 않습니다.  
  → 팀 내 `sort_order`가 초기화·맨 뒤로 밀리지 않습니다.
- **팀 변경/배정** → 기존 멤버십 삭제 후, 새 팀의 `sort_order = max+1`로 insert합니다.
- 팀 삭제·인원 hard-delete 가드는 출장 이력(`trip_participants`)을 따릅니다.  
  → `lib/directory-delete-guards.ts`

## 정렬 컬럼 역할

| 컬럼 | 쓰는 화면 | 갱신 API |
|------|-----------|----------|
| `people.sort_order` | 디렉터리 **전체** 탭 | `PATCH /api/people` (`orderedIds`) |
| `team_members.sort_order` | 디렉터리 **팀별** 탭 | `PATCH /api/teams/:id` (`memberIds` 순서) |

- 두 순서는 **독립**입니다. 전체 탭 DnD는 전역 순서만, 팀 탭 DnD는 해당 팀 멤버 순서만 바꿉니다.
- `GET /api/people`는 `people.sort_order` 기준입니다. 팀 목록의 `memberIds`는 `team_members.sort_order` 기준입니다.
