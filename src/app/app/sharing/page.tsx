import { requireUser } from "@/lib/auth";
import type { Event, Person, SharedList } from "@/lib/types";
import { PageHeader } from "@/components/common";
import { SharingPanel } from "@/components/sharing-panel";
export default async function Page() {
  const { supabase, user } = await requireUser();
  const events: Event[] = []; const people: Person[] = []; const shares: SharedList[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("people").select("id,name").eq("user_id", user.id).order("name").range(from, from+499);
    if (error) throw new Error("Could not load people.");
    people.push(...(data as Person[])); if (!data || data.length < 500) break;
  }
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("events_display").select("id,title,event_date").eq("user_id", user.id).order("event_date").range(from, from+499);
    if (error) throw new Error("Could not load events.");
    events.push(...(data as Event[])); if (!data || data.length < 500) break;
  }
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("shared_lists").select("id,event_id,person_id,created_at,revoked_at").eq("user_id", user.id).is("revoked_at", null).order("created_at", { ascending: false }).range(from, from+499);
    if (error) throw new Error("Could not load shared lists.");
    shares.push(...(data as SharedList[])); if (!data || data.length < 500) break;
  }
  return <><PageHeader eyebrow="Sharing" title="Share your gift lists" description="Invite someone to view a list without giving access to your account."/><SharingPanel people={people} events={events} shares={shares}/></>;
}
