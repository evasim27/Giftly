import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { Person, Gift } from "@/lib/types";
import { eur } from "@/lib/utils";
import { PageHeader, BudgetMeter, StatusBadge } from "@/components/common";
import { EntityForm } from "@/components/entity-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params; const { saved } = await searchParams; const { supabase, user } = await requireUser();
  const [{ data: person }, { data: budget }, { data: gifts }, { data: totals }] = await Promise.all([
    supabase.from("people").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("person_budgets").select("amount").eq("person_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("gifts").select("id,name,status,estimated_price,actual_price").eq("person_id", id).eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.rpc("get_my_gift_totals", { p_person_id: id }),
  ]);
  if (!person) notFound();
  return <>
    <PageHeader eyebrow="Person details" title={(person as Person).name} description="Edit their details and track thoughtful plans." action="Add gift" href={`/app/gifts/new?person_id=${id}`}/>
    {saved && <p role="status" className="mb-5 rounded-lg bg-sage-50 p-3 text-sm text-sage-700">Saved successfully.</p>}
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
      <EntityForm kind="people" id={id} initial={person} budget={budget?.amount}/>
      <div className="space-y-6">
        <Card className="p-7"><p className="eyebrow mb-2 text-sage-700">At a glance</p><h2 className="mb-6 font-display text-3xl">Budget overview</h2><BudgetMeter budget={budget?.amount ?? null} spent={Number((totals as { spent?: number } | null)?.spent ?? 0)}/></Card>
        <Card className="p-7"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow mb-2 text-sage-700">For this person</p><h2 className="font-display text-3xl">Recent gifts</h2></div><Button asChild size="sm" variant="ghost"><Link href={`/app/gifts/new?person_id=${id}`}>Add</Link></Button></div>{gifts?.length ? <div className="divide-y divide-border">{(gifts as Gift[]).map(g => <Link href={`/app/gifts/${g.id}`} key={g.id} className="flex items-center justify-between gap-2 py-4 text-sm transition-colors hover:text-sage-700"><span className="truncate font-medium">{g.name}<span className="mt-1 block text-xs text-stone-500">{eur(g.actual_price ?? g.estimated_price)}</span></span><StatusBadge status={g.status}/></Link>)}</div> : <p className="py-3 text-sm text-stone-600">No gifts assigned yet.</p>}</Card>
      </div>
    </div>
  </>;
}
