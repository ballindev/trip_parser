import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapTrips,
  type DbLodging,
  type DbMeal,
  type DbParticipant,
  type DbReport,
  type DbTransport,
  type DbTransportPerson,
  type DbTrip,
  type DbWorkHour,
} from "@/lib/mappers";
import type { Trip } from "@/lib/types";

export async function fetchAllTrips(): Promise<Trip[]> {
  const supabase = getSupabaseServerClient();

  const [
    tripsRes,
    participantsRes,
    reportsRes,
    hoursRes,
    mealsRes,
    transportsRes,
    lodgingsRes,
    transportPeopleRes,
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: false }),
    supabase
      .from("trip_participants")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("participant_reports").select("*"),
    supabase.from("daily_work_hours").select("*"),
    supabase.from("daily_meals").select("*"),
    supabase.from("transport_items").select("*"),
    supabase.from("lodging_items").select("*"),
    supabase.from("transport_item_people").select("*"),
  ]);

  const firstError =
    tripsRes.error ||
    participantsRes.error ||
    reportsRes.error ||
    hoursRes.error ||
    mealsRes.error ||
    transportsRes.error ||
    lodgingsRes.error ||
    transportPeopleRes.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return mapTrips({
    trips: (tripsRes.data ?? []) as DbTrip[],
    participants: (participantsRes.data ?? []) as DbParticipant[],
    reports: (reportsRes.data ?? []) as DbReport[],
    hours: (hoursRes.data ?? []) as DbWorkHour[],
    meals: (mealsRes.data ?? []) as DbMeal[],
    transports: (transportsRes.data ?? []) as DbTransport[],
    lodgings: (lodgingsRes.data ?? []) as DbLodging[],
    transportPeople: (transportPeopleRes.data ?? []) as DbTransportPerson[],
  });
}
