import Link from "next/link";
import { ArrowUpRight, CalendarDays, Gift, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { Event, Gift as GiftType } from "@/lib/types";
import { withGiftImageUrls } from "@/lib/gift-images";
import { dateLabel, eur } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";
import { GiftCard } from "@/components/gift-card";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const [{ count: peopleCount, error: peopleError }, { count: eventCount, error: eventsError }, { count: giftCount, error: giftsError }, { data: upcoming, error: upcomingError }, { data: recent, error: recentError }, { data: totals, error: totalsError }] = await Promise.all([
    supabase.from("people").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("gifts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("events_display").select("id,title,event_date,budget").eq("user_id", user.id).gte("event_date", new Date().toISOString().slice(0,10)).order("event_date").limit(4),
    supabase.from("gifts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
    supabase.rpc("get_my_gift_totals"),
  ]);
  if (peopleError || eventsError || giftsError || upcomingError || recentError || totalsError) throw new Error("Could not load your dashboard. Check your Supabase configuration and migration.");
  const summary = totals as { spent: number; committed: number } | null;
  const gifts = await withGiftImageUrls(supabase, (recent || []) as GiftType[]);
  const personIds = [...new Set(gifts.map(g => g.person_id).filter((id): id is string => Boolean(id)))];
  const { data: recipients } = personIds.length ? await supabase.from("people").select("id,name").eq("user_id", user.id).in("id", personIds) : { data: [] };
  const names = new Map((recipients || []).map(person => [person.id, person.name]));

  return <>
    <header className="mb-11 border-b border-border pb-10 sm:mb-14"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="eyebrow mb-5 text-sage-700">Your gifting journal</p><h1 className="font-display text-[3.25rem] leading-[.95] tracking-[-.025em] sm:text-[4.7rem]">Beautifully planned,<br/><span className="italic text-sage-600">thoughtfully given.</span></h1><p className="mt-6 max-w-lg text-sm leading-7 text-stone-600 sm:text-base">Welcome back. A little space to gather good ideas and make every occasion feel personal.</p></div><span className="eyebrow border-b border-sage-300 pb-2 text-stone-500">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date())}</span></div></header>
    <section aria-label="Your gifting at a glance" className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
      <div className="relative flex min-h-64 flex-col justify-between overflow-hidden rounded-xl bg-foreground p-7 text-white sm:p-9"><Gift className="absolute -right-8 -top-12 h-48 w-48 rotate-[-14deg] text-white/10" strokeWidth={.8}/><p className="eyebrow relative text-sage-200">The collection</p><div className="relative mt-8 flex flex-wrap items-end justify-between gap-6"><div><p className="font-display text-7xl leading-none sm:text-8xl">{giftCount ?? 0}</p><h2 className="mt-2 max-w-xs font-display text-3xl leading-tight">Ideas waiting to become memories.</h2></div><Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:border-white hover:bg-white/20"><Link href="/app/gifts/new"><Plus size={16}/>Add a gift</Link></Button></div></div>
      <Card className="flex flex-col justify-between bg-sage-100 p-7 sm:p-9"><p className="eyebrow text-sage-700">Your circle</p><div className="mt-8 grid grid-cols-2 gap-6"><div><Users size={20} strokeWidth={1.5} className="text-sage-700"/><p className="mt-4 font-display text-5xl">{peopleCount ?? 0}</p><p className="mt-1 text-sm font-semibold text-stone-600">People</p></div><div><CalendarDays size={20} strokeWidth={1.5} className="text-sage-700"/><p className="mt-4 font-display text-5xl">{eventCount ?? 0}</p><p className="mt-1 text-sm font-semibold text-stone-600">Occasions</p></div></div><div className="mt-8 flex gap-5 border-t border-sage-200 pt-5 text-sm font-semibold"><Link href="/app/people" className="hover:underline">People ↗</Link><Link href="/app/events" className="hover:underline">Events ↗</Link></div></Card>
    </section>
    <section className="mt-16"><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-sage-700">Collected with care</p><h2 className="font-display text-4xl leading-none sm:text-5xl">Recent gift ideas</h2></div><Link href="/app/gifts" className="inline-flex items-center gap-1 border-b border-foreground pb-1 text-sm font-semibold hover:text-sage-700">Explore collection <ArrowUpRight size={16}/></Link></div>{gifts.length ? <div className="masonry">{gifts.map(gift => <GiftCard key={gift.id} gift={gift} recipient={gift.person_id ? names.get(gift.person_id) : null} compact/>)}</div> : <EmptyState title="The best ideas start small" description="Whenever inspiration finds you, save it here for later." href="/app/gifts/new" action="Add your first gift"/>}</section>
    <section className="mt-14 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(270px,1fr)]"><Card className="p-7 sm:p-8"><div className="mb-6 flex items-end justify-between gap-3"><div><p className="eyebrow mb-3 text-sage-700">On the horizon</p><h2 className="font-display text-3xl sm:text-4xl">Upcoming occasions</h2></div><Link href="/app/events" className="text-sm font-semibold underline underline-offset-4 hover:text-sage-700">View all</Link></div>{upcoming?.length ? <div className="divide-y divide-border">{(upcoming as Event[]).map(event => <Link key={event.id} href={`/app/events/${event.id}`} className="group flex items-center justify-between gap-4 py-4"><div className="flex items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sage-50 text-sage-700"><CalendarDays size={20} strokeWidth={1.5}/></span><div><p className="font-semibold group-hover:text-sage-700">{event.title}</p><p className="mt-1 text-xs text-stone-500">{dateLabel(event.event_date)}</p></div></div><ArrowUpRight size={17} className="text-stone-400 group-hover:text-sage-700"/></Link>)}</div> : <p className="py-10 text-sm text-stone-500">Nothing on the calendar just yet.</p>}</Card><Card className="flex flex-col justify-between bg-[#EEECE5] p-7 sm:p-8"><div><p className="eyebrow mb-3 text-sage-700">A thoughtful balance</p><h2 className="font-display text-3xl sm:text-4xl">Budget overview</h2></div><div className="mt-10"><p className="eyebrow text-stone-500">Spent on gifts</p><p className="mt-2 font-display text-5xl leading-none">{eur(summary?.spent)}</p><div className="mt-7 flex items-center justify-between border-t border-[#D7D3C9] pt-5 text-sm"><span className="text-stone-600">Planned commitment</span><strong>{eur(summary?.committed)}</strong></div><p className="mt-4 text-xs leading-6 text-stone-500">Track individual budgets on each person and occasion.</p></div></Card></section>
  </>;
}
