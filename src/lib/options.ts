import { requireUser } from "@/lib/auth";
import type { Event, Person } from "@/lib/types";
export async function getAssignmentOptions() {
  const { supabase, user } = await requireUser();
  const people: Person[] = []; const events: Event[] = [];
  for (let from = 0; ; from += 500) { const { data, error } = await supabase.from("people").select("id,name").eq("user_id", user.id).order("name").range(from, from+499); if (error) throw new Error(error.message); people.push(...(data as Person[])); if (!data || data.length < 500) break; }
  for (let from = 0; ; from += 500) { const { data, error } = await supabase.from("events_display").select("id,title").eq("user_id", user.id).order("title").range(from, from+499); if (error) throw new Error(error.message); events.push(...(data as Event[])); if (!data || data.length < 500) break; }
  return { people, events };
}
