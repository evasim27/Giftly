import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAssignmentOptions } from "@/lib/options";
import type { Gift } from "@/lib/types";
import { withGiftImageUrls } from "@/lib/gift-images";
import { eur } from "@/lib/utils";
import { PageHeader, StatusBadge } from "@/components/common";
import { EntityForm } from "@/components/entity-form";
import { GiftVisual } from "@/components/gift-card";
import { Card } from "@/components/ui/card";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const { saved } = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data }, { people, events }] = await Promise.all([supabase.from("gifts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(), getAssignmentOptions()]);
  if (!data) notFound();
  const [gift] = await withGiftImageUrls(supabase, [data as Gift]);
  return <><PageHeader eyebrow="The collection" title={gift.name} description="The details behind a thoughtful gift idea."/>
    {saved && <p role="status" className="mb-5 rounded-lg border border-sage-200 bg-sage-50 p-3 text-sm text-sage-700">Saved successfully.</p>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><EntityForm kind="gifts" id={id} initial={gift} initialImageUrl={gift.display_image_url} people={people} events={events}/><div className="space-y-5"><div className="group overflow-hidden rounded-xl border border-border bg-white"><GiftVisual name={gift.name} visualKey={gift.id} imageUrl={gift.display_image_url} height={280}/><div className="p-5"><p className="eyebrow text-sage-700">Collected with care</p><h2 className="mt-2 font-display text-3xl">{gift.name}</h2></div></div><Card><h2 className="mb-6 font-display text-2xl">At a glance</h2><dl className="space-y-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-stone-500">Status</dt><dd><StatusBadge status={gift.status}/></dd></div><div className="flex justify-between gap-3"><dt className="text-stone-500">Estimated</dt><dd className="font-semibold">{eur(gift.estimated_price)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-500">Actual</dt><dd className="font-semibold">{gift.actual_price == null ? "Not recorded" : eur(gift.actual_price)}</dd></div>{gift.person_id && <div className="flex justify-between gap-3"><dt className="text-stone-500">For</dt><dd><Link className="font-semibold text-sage-700 underline underline-offset-4" href={`/app/people/${gift.person_id}`}>{people.find(x => x.id === gift.person_id)?.name || "Person"}</Link></dd></div>}{gift.event_id && <div className="flex justify-between gap-3"><dt className="text-stone-500">Occasion</dt><dd><Link className="font-semibold text-sage-700 underline underline-offset-4" href={`/app/events/${gift.event_id}`}>{events.find(x => x.id === gift.event_id)?.title || "Event"}</Link></dd></div>}</dl>{gift.product_url && <a href={gift.product_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-7 inline-flex items-center gap-2 border-b border-sage-700 pb-1 text-sm font-semibold text-sage-700">View product <ExternalLink size={15}/></a>}</Card></div></div>
  </>;
}
