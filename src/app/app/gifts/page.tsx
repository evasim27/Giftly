import { Search, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getAssignmentOptions } from "@/lib/options";
import type { Gift } from "@/lib/types";
import { withGiftImageUrls } from "@/lib/gift-images";
import { parsePage } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddedNotice, EmptyState, PageHeader } from "@/components/common";
import { GiftCard } from "@/components/gift-card";
import { Pagination } from "@/components/pagination";

const size = 24;
type Filters = { q?: string; status?: string; person?: string; event?: string; sort?: string; page?: string; added?: string };
export default async function GiftsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const filters = await searchParams;
  const page = parsePage(filters.page);
  const q = (typeof filters.q === "string" ? filters.q : "").trim().slice(0,100);
  const status = ["idea","planned","purchased","gifted"].includes(filters.status || "") ? filters.status! : "";
  const sort = ["newest","oldest","name","price_low","price_high"].includes(filters.sort || "") ? filters.sort! : "newest";
  const person = z.uuid().safeParse(filters.person).success ? filters.person! : "";
  const event = z.uuid().safeParse(filters.event).success ? filters.event! : "";
  const { supabase, user } = await requireUser();
  const { people, events } = await getAssignmentOptions();
  let query = supabase.from("gifts").select("*", { count: "exact" }).eq("user_id", user.id);
  if (q) query = query.ilike("name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (status) query = query.eq("status", status);
  if (person) query = query.eq("person_id", person);
  if (event) query = query.eq("event_id", event);
  if (sort === "name") query = query.order("name", { ascending: true });
  else if (sort === "price_low" || sort === "price_high") query = query.order("estimated_price", { ascending: sort === "price_low", nullsFirst: false });
  else query = query.order("created_at", { ascending: sort === "oldest" });
  const { data, count, error } = await query.range((page-1)*size, page*size-1);
  if (error) throw new Error(error.message);
  const gifts = await withGiftImageUrls(supabase, (data || []) as Gift[]);
  const peopleMap = new Map(people.map(x => [x.id,x.name]));
  const eventsMap = new Map(events.map(x => [x.id,x.title]));

  return <>
    <PageHeader eyebrow="The collection" title="Gift ideas, beautifully kept." description="A quiet place for every little thought worth remembering." action="Add a gift" href="/app/gifts/new"/>
    {filters.added === "1" && <AddedNotice item="Gift"/>}
    <Card className="mb-9 p-4 sm:p-5"><form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(190px,1.5fr)_repeat(4,minmax(120px,1fr))_auto]">
      <div className="relative"><Search size={16} className="absolute left-3 top-3.5 text-stone-500"/><Input name="q" aria-label="Search gift name" placeholder="Search the collection" defaultValue={q} className="pl-9"/></div>
      <Select aria-label="Filter by status" name="status" defaultValue={status}><option value="">All statuses</option><option value="idea">Ideas</option><option value="planned">Planned</option><option value="purchased">Purchased</option><option value="gifted">Gifted</option></Select>
      <Select aria-label="Filter by person" name="person" defaultValue={person}><option value="">All people</option>{people.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
      <Select aria-label="Filter by event" name="event" defaultValue={event}><option value="">All occasions</option>{events.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</Select>
      <Select aria-label="Sort gifts" name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option><option value="price_low">Est. price low</option><option value="price_high">Est. price high</option></Select>
      <Button type="submit" variant="outline"><SlidersHorizontal size={15}/>Apply</Button>
    </form></Card>
    {gifts.length ? <><div className="mb-5 flex items-center justify-between border-b border-border pb-3"><p className="eyebrow text-stone-500">{count} {count === 1 ? "idea" : "ideas"} in your collection</p><p className="text-xs text-stone-500">Made to be remembered</p></div><div className="masonry">{gifts.map(gift => <GiftCard key={gift.id} gift={gift} recipient={gift.person_id ? peopleMap.get(gift.person_id) : null} event={gift.event_id ? eventsMap.get(gift.event_id) : null}/>)}</div></> : <EmptyState title={q || status || person || event ? "Nothing quite like that yet" : "A blank page for your best ideas"} description={q || status || person || event ? "Try a different search or filter to rediscover an idea." : "Save the first thoughtful gift and let your collection grow naturally."} href="/app/gifts/new" action="Add a gift"/>}
    <Pagination page={page} total={count || 0} pageSize={size} base="/app/gifts" query={{ q, status, person, event, sort }}/>
  </>;
}
