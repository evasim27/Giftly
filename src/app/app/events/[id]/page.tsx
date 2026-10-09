import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Event, Gift } from "@/lib/types";
import { dateLabel, eur } from "@/lib/utils";
import { PageHeader, BudgetMeter, StatusBadge } from "@/components/common";
import { EntityForm } from "@/components/entity-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: event }, { data: gifts }, { data: totals }] = await Promise.all([
    supabase.from("events_display").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("gifts").select("id,name,status,estimated_price,actual_price").eq("event_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.rpc("get_my_gift_totals", { p_event_id: id }),
  ]);
  if (!event) notFound();
  const item = event as Event;
  const giftHref = `/app/gifts/new?event_id=${id}${item.birthday_person_id ? `&person_id=${item.birthday_person_id}` : ""}`;

  return <>
    <PageHeader eyebrow="Event details" title={item.title} description={dateLabel(item.event_date)} action="Add gift" href={giftHref}/>
    {saved && <p role="status" className="mb-5 rounded-lg bg-sage-50 p-3 text-sm text-sage-700">Saved successfully.</p>}
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
      <EntityForm kind="events" id={id} initial={event} birthdayPersonId={item.birthday_person_id}/>
      <div className="space-y-6">
        <Card className="p-7"><p className="eyebrow mb-2 text-sage-700">At a glance</p><h2 className="mb-6 font-display text-3xl">Budget overview</h2><BudgetMeter budget={item.budget} spent={Number((totals as { spent?: number } | null)?.spent ?? 0)}/></Card>
        <Card className="p-7"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow mb-2 text-sage-700">For this occasion</p><h2 className="font-display text-3xl">Event gifts</h2></div><Button asChild size="sm" variant="ghost"><Link href={giftHref}>Add</Link></Button></div>{gifts?.length ? <div className="divide-y divide-border">{(gifts as Gift[]).map(gift => <Link href={`/app/gifts/${gift.id}`} key={gift.id} className="flex items-center justify-between gap-2 py-4 text-sm transition-colors hover:text-sage-700"><span className="truncate font-medium">{gift.name}<span className="mt-1 block text-xs text-stone-500">{eur(gift.actual_price ?? gift.estimated_price)}</span></span><StatusBadge status={gift.status}/></Link>)}</div> : <p className="py-3 text-sm text-stone-600">No gifts assigned yet.</p>}</Card>
        <Button asChild variant="outline" className="w-full"><Link href="/app/sharing">Share a list</Link></Button>
      </div>
    </div>
  </>;
}
