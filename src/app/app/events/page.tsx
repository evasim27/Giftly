import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { Event } from "@/lib/types";
import { dateLabel, eur, parsePage } from "@/lib/utils";
import { AddedNotice, EmptyState, PageHeader } from "@/components/common";
import { Pagination } from "@/components/pagination";

const size = 24;
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ page?: string; added?: string }> }) {
  const { page: pageParam, added } = await searchParams;
  const page = parsePage(pageParam);
  const { supabase, user } = await requireUser();
  const { data, count, error } = await supabase.from("events_display").select("*", { count: "exact" }).eq("user_id", user.id).order("event_date", { ascending: true }).range((page-1)*size, page*size-1);
  if (error) throw new Error(error.message);
  const events = (data || []) as Event[];

  return <><PageHeader eyebrow="The calendar" title="Occasions worth keeping." description="Plan ahead for birthdays, milestones, and every meaningful moment." action="Add an occasion" href="/app/events/new"/>
    {added === "1" && <AddedNotice item="Occasion"/>}
    {events.length ? <><p className="eyebrow mb-5 text-stone-500">{count} {count === 1 ? "occasion" : "occasions"} on your calendar</p><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{events.map((event, index) => <Link href={`/app/events/${event.id}`} key={event.id} className="group flex min-h-64 flex-col rounded-xl border border-border bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-sage-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"><div className="flex items-start justify-between"><span className="eyebrow text-sage-700">Occasion / {String((page-1)*size+index+1).padStart(2,"0")}</span><ArrowUpRight size={18} className="text-stone-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></div><div className="mt-6 flex items-end gap-3"><span className="font-display text-[4.2rem] leading-none text-sage-700">{new Date(`${event.event_date}T12:00:00Z`).getUTCDate()}</span><div className="pb-1"><p className="eyebrow text-stone-500">{new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(`${event.event_date}T12:00:00Z`))}</p><p className="text-xs text-stone-500">{dateLabel(event.event_date)}</p></div></div><h2 className="mt-5 font-display text-[2rem] leading-[1.05]">{event.title}</h2>{event.birthday_person_id && <span className="eyebrow mt-3 text-sage-700">Annual birthday</span>}<div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4 text-xs text-stone-600"><span className="flex items-center gap-1.5"><CalendarDays size={14}/>Event budget</span><span className="font-semibold text-foreground">{event.budget == null ? "Not set" : eur(event.budget)}</span></div></Link>)}</div></> : <EmptyState title="The calendar is yours to fill" description="Add an occasion and make more room for the moments that matter." href="/app/events/new" action="Add your first occasion"/>}
    <Pagination page={page} total={count || 0} pageSize={size} base="/app/events"/>
  </>;
}
