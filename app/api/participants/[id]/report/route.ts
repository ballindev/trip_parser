import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { isReportReadyToSubmit } from "@/lib/report-validation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ReportForm, WriteStatus } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id: participantId } = await params;
    const body = await readJson<{
      form: ReportForm;
      status?: WriteStatus;
    }>(request);

    const form = body.form;
    if (!form) return jsonError("form 이 필요합니다.");

    if (body.status === "완료" && !isReportReadyToSubmit(form)) {
      return jsonError("필수값을 모두 입력해야 제출할 수 있습니다.");
    }

    const supabase = getSupabaseServerClient();

    const { error: reportError } = await supabase
      .from("participant_reports")
      .upsert({
        participant_id: participantId,
        region: form.region ?? "",
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        updated_at: new Date().toISOString(),
      });

    if (reportError) return jsonError(reportError.message, 500);

    if (body.status) {
      const { error: statusError } = await supabase
        .from("trip_participants")
        .update({ status: body.status })
        .eq("id", participantId);
      if (statusError) return jsonError(statusError.message, 500);
    }

    // Replace child rows
    await Promise.all([
      supabase.from("daily_work_hours").delete().eq("participant_id", participantId),
      supabase.from("daily_meals").delete().eq("participant_id", participantId),
      supabase.from("transport_items").delete().eq("participant_id", participantId),
      supabase.from("lodging_items").delete().eq("participant_id", participantId),
    ]);

    if (form.dailyHours.length > 0) {
      const { error } = await supabase.from("daily_work_hours").insert(
        form.dailyHours.map((day) => ({
          participant_id: participantId,
          work_date: day.date,
          start_time: day.startTime,
          end_time: day.endTime,
          hours: day.hours,
          morning_claim: day.morningClaim ?? null,
        })),
      );
      if (error) return jsonError(error.message, 500);
    }

    if (form.dailyMeals.length > 0) {
      const { error } = await supabase.from("daily_meals").insert(
        form.dailyMeals.map((day) => ({
          participant_id: participantId,
          meal_date: day.date,
          breakfast: day.breakfast,
          lunch: day.lunch,
          dinner: day.dinner,
        })),
      );
      if (error) return jsonError(error.message, 500);
    }

    if (form.transportItems.length > 0) {
      const { error } = await supabase.from("transport_items").insert(
        form.transportItems.map((item, index) => ({
          id: item.id,
          participant_id: participantId,
          mode: item.mode,
          amount: item.amount,
          people: item.people,
          times: item.times,
          sort_order: index,
        })),
      );
      if (error) return jsonError(error.message, 500);

      const transportPeopleRows = form.transportItems.flatMap((item) =>
        item.mode === "렌트"
          ? (item.personIds ?? []).map((personId) => ({
              transport_item_id: item.id,
              person_id: personId,
            }))
          : [],
      );

      if (transportPeopleRows.length > 0) {
        const { error: peopleError } = await supabase
          .from("transport_item_people")
          .insert(transportPeopleRows);
        if (peopleError) return jsonError(peopleError.message, 500);
      }
    }

    if (form.lodgingItems.length > 0) {
      const { error } = await supabase.from("lodging_items").insert(
        form.lodgingItems.map((item, index) => ({
          id: item.id,
          participant_id: participantId,
          amount: item.amount,
          people: 1,
          times: item.times,
          sort_order: index,
        })),
      );
      if (error) return jsonError(error.message, 500);
    }

    return jsonOk({ ok: true, form });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "저장 실패", 500);
  }
}
