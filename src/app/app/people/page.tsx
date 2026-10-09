import Link from "next/link";
import { ArrowUpRight, Cake } from "lucide-react";
import { requireUser } from "@/lib/auth";
import type { Person, PersonBudget } from "@/lib/types";
import { dateLabel, eur, parsePage } from "@/lib/utils";
import { AddedNotice, EmptyState, PageHeader } from "@/components/common";
import { Pagination } from "@/components/pagination";

const size = 24;
const tones = ["bg-[#EBECE5]", "bg-[#F1EBE5]", "bg-[#E8ECE8]"];
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ page?: string; added?: string }> }) {
  const { page: pageParam, added } = await searchParams;
  const page = parsePage(pageParam);
  const { supabase, user } = await requireUser();
  const { data, count, error } = await supabase.from("people").select("*", { count: "exact" }).eq("user_id", user.id).order("name").range((page-1)*size, page*size-1);
  if (error) throw new Error(error.message);
  const people = (data || []) as Person[];
  const { data: budgets, error: budgetError } = people.length ? await supabase.from("person_budgets").select("person_id,amount").in("person_id", people.map(p => p.id)) : { data: [], error: null };
  if (budgetError) throw new Error(budgetError.message);
  const budgetByPerson = new Map((budgets as PersonBudget[]).map(b => [b.person_id, b.amount]));

  return <><PageHeader eyebrow="The people" title="People, remembered." description="Keep the little details close, from their favorite things to their next celebration." action="Add a person" href="/app/people/new"/>
    {added === "1" && <AddedNotice item="Person"/>}
    {people.length ? <><p className="eyebrow mb-5 text-stone-500">{count} {count === 1 ? "person" : "people"} in your circle</p><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{people.map((person, index) => <Link href={`/app/people/${person.id}`} key={person.id} className="group block overflow-hidden rounded-xl border border-border bg-white transition-all duration-200 hover:-translate-y-1 hover:border-sage-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"><div className={`relative flex h-40 items-center justify-center ${tones[index % tones.length]}`}><span className="font-display text-[6rem] leading-none text-sage-700/65">{person.name.slice(0,1).toUpperCase()}</span><ArrowUpRight size={18} className="absolute right-5 top-5 text-stone-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></div><div className="p-5"><p className="eyebrow text-sage-700">{person.relationship || "A special person"}</p><h2 className="mt-3 font-display text-[2rem] leading-none">{person.name}</h2><div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4 text-xs text-stone-600"><span className="flex items-center gap-1.5"><Cake size={15} strokeWidth={1.6}/>{person.birthday ? dateLabel(person.birthday) : "No birthday set"}</span><span className="font-semibold text-foreground">{budgetByPerson.has(person.id) ? eur(budgetByPerson.get(person.id)) : "No budget"}</span></div></div></Link>)}</div></> : <EmptyState title="Every story starts with someone" description="Add a person to keep their ideas, occasions, and thoughtful details together." href="/app/people/new" action="Add your first person"/>}
    <Pagination page={page} total={count || 0} pageSize={size} base="/app/people"/>
  </>;
}
