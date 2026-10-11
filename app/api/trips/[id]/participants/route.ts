import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { emptyForm } from "@/lib/mappers";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildDailyHours } from "@/lib/daily-hours";
import { buildDailyMeals } from "@/lib/daily-meals";
import type { Participant, Person } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: tripId } = await params;
    const body = await readJson<{ people: Person[] }>(request);
    const people = body.people ?? [];
    if (people.length === 0) return jsonError("추가할 사람을 선택해 주세요.");

    const supabase = getSupabaseServerClient();
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError) return jsonError(tripError.message, 500);

    const { data: existingRows, error: existingError } = await supabase
      .from("trip_participants")
      .select("sort_order")
      .eq("trip_id", tripId)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (existingError) return jsonError(existingError.message, 500);

    const nextSortOrder =
      typeof existingRows?.[0]?.sort_order === "number"
        ? existingRows[0].sort_order + 1
        : 0;

    const startDate = trip.start_date as string;
    const endDate = trip.end_date as string;
    const dailyHours = buildDailyHours(startDate, endDate);
    const dailyMeals = buildDailyMeals(startDate, endDate);

    const { data: inserted, error } = await supabase
      .from("trip_participants")
      .insert(
        people.map((person, index) => ({
          trip_id: tripId,
          person_id: person.id,
          name: person.name,
          department: person.department,
          status: "미작성",
          sort_order: nextSortOrder + index,
        })),
      )
      .select("*");

    if (error) return jsonError(error.message, 500);

    const participants = (inserted ?? []) as Array<{
      id: string;
      person_id: string | null;
      name: string;
      department: string;
      status: Participant["status"];
    }>;

    if (participants.length > 0) {
      const { error: reportError } = await supabase
        .from("participant_reports")
        .insert(
          participants.map((participant) => ({
            participant_id: participant.id,
            region: "",
            start_date: startDate,
            end_date: endDate,
          })),
        );
      if (reportError) return jsonError(reportError.message, 500);

      const { error: hoursError } = await supabase.from("daily_work_hours").insert(
        participants.flatMap((participant) =>
          dailyHours.map((day) => ({
            participant_id: participant.id,
            work_date: day.date,
            start_time: day.startTime,
            end_time: day.endTime,
            hours: day.hours,
          })),
        ),
      );
      if (hoursError) return jsonError(hoursError.message, 500);

      const { error: mealsError } = await supabase.from("daily_meals").insert(
        participants.flatMap((participant) =>
          dailyMeals.map((day) => ({
            participant_id: participant.id,
            meal_date: day.date,
            breakfast: day.breakfast,
            lunch: day.lunch,
            dinner: day.dinner,
          })),
        ),
      );
      if (mealsError) return jsonError(mealsError.message, 500);
    }

    const mapped: Participant[] = participants.map((participant) => ({
      id: participant.id,
      personId: participant.person_id ?? undefined,
      name: participant.name,
      department: participant.department,
      status: participant.status,
      form: {
        ...emptyForm(startDate, endDate),
        dailyHours,
        dailyMeals,
      },
    }));

    return jsonOk(mapped, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "추가 실패", 500);
  }
}

/** 참여자 표시 순서를 일괄 갱신합니다. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id: tripId } = await params;
    const body = await readJson<{ orderedIds?: string[] }>(request);
    const orderedIds = body.orderedIds ?? [];

    if (orderedIds.length === 0) {
      return jsonError("정렬할 참여자 목록이 없습니다.");
    }

    const supabase = getSupabaseServerClient();
    const { data: existing, error: existingError } = await supabase
      .from("trip_participants")
      .select("id")
      .eq("trip_id", tripId);

    if (existingError) return jsonError(existingError.message, 500);

    const existingIds = new Set((existing ?? []).map((row) => row.id as string));
    if (
      orderedIds.length !== existingIds.size ||
      orderedIds.some((id) => !existingIds.has(id))
    ) {
      return jsonError("참여자 목록이 현재 출장과 일치하지 않습니다.");
    }

    const updates = await Promise.all(
      orderedIds.map((participantId, index) =>
        supabase
          .from("trip_participants")
          .update({ sort_order: index })
          .eq("id", participantId)
          .eq("trip_id", tripId),
      ),
    );

    const failed = updates.find((result) => result.error);
    if (failed?.error) return jsonError(failed.error.message, 500);

    return jsonOk({ ok: true, orderedIds });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "순서 변경 실패",
      500,
    );
  }
}
