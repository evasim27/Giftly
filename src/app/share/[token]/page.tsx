import Link from "next/link";
import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, ExternalLink, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common";
import { GiftVisual } from "@/components/gift-card";
import { dateLabel, eur } from "@/lib/utils";
import type { GiftStatus } from "@/lib/types";
import { externalImageUrl, GIFT_IMAGE_BUCKET, IMAGE_URL_SECONDS, ownImagePath } from "@/lib/gift-images";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const metadata = { robots: { index: false, follow: false } };
type PublicGift = { id: string; name: string; description: string; estimated_price: number | null; product_url: string | null; status: GiftStatus; image_url: string | null; display_image_url?: string | null };
type PublicList = { title: string; event_date: string | null; gifts: PublicGift[] };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const hash = createHash("sha256").update(token).digest("hex");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("get_shared_list", { p_token_hash: hash });
  if (error || !data) notFound();
  const list = data as PublicList;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && list.gifts.length) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: share } = await admin.from("shared_lists").select("user_id,event_id,person_id").eq("token_hash", hash).is("revoked_at", null).maybeSingle();
    if (!share) notFound();
    let imageQuery = admin.from("gifts").select("id,image_path").eq("user_id", share.user_id).in("id", list.gifts.map(gift => gift.id));
    if (share.event_id) imageQuery = imageQuery.eq("event_id", share.event_id);
    if (share.person_id) imageQuery = imageQuery.eq("person_id", share.person_id);
    const { data: imageRows } = await imageQuery;
    const paths = [...new Set((imageRows || []).map(row => row.image_path).filter((path): path is string => typeof path === "string" && ownImagePath(path, share.user_id)))];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await admin.storage.from(GIFT_IMAGE_BUCKET).createSignedUrls(paths, IMAGE_URL_SECONDS);
      urls?.forEach((item, index) => { if (item.signedUrl) signed.set(paths[index], item.signedUrl); });
    }
    const pathByGift = new Map((imageRows || []).map(row => [row.id, row.image_path]));
    list.gifts = list.gifts.map(gift => ({ ...gift, display_image_url: signed.get(pathByGift.get(gift.id) || "") || externalImageUrl(gift.image_url) }));
  } else {
    list.gifts = list.gifts.map(gift => ({ ...gift, display_image_url: externalImageUrl(gift.image_url) }));
  }

  return <main className="min-h-screen bg-background px-5 py-7 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between border-b border-border pb-6"><Link href="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-100 text-sage-700"><Gift size={18} strokeWidth={1.6}/></span><span className="font-display text-[2rem] leading-none">giftly<span className="text-sage-600">.</span></span></Link><span className="eyebrow hidden text-sage-700 sm:block">A shared collection</span></header>
    <section className="max-w-3xl py-14 sm:py-20"><p className="eyebrow mb-5 text-sage-700">A thoughtful list, just for you</p><h1 className="font-display text-[3.8rem] leading-[.93] tracking-[-.025em] sm:text-[5.5rem]">{list.title}<span className="text-sage-600">.</span></h1>{list.event_date && <p className="mt-5 text-sm font-semibold text-stone-600">{dateLabel(list.event_date)}</p>}<p className="mt-6 text-sm leading-7 text-stone-600">Someone shared these gift ideas with you. This page is read-only.</p></section>
    {list.gifts.length ? <><div className="mb-5 flex items-center justify-between border-b border-border pb-3"><p className="eyebrow text-stone-500">{list.gifts.length} {list.gifts.length === 1 ? "idea" : "ideas"} to explore</p><p className="text-xs text-stone-500">Collected with care</p></div><div className="masonry">{list.gifts.map((gift, index) => <article key={`${gift.name}-${index}`} className="group overflow-hidden rounded-xl border border-border bg-white"><GiftVisual name={gift.name} visualKey={`${gift.name}-${index}`} imageUrl={gift.display_image_url}/><div className="p-5"><div className="flex items-center justify-between gap-2"><p className="eyebrow text-sage-700">Gift idea</p><StatusBadge status={gift.status}/></div><h2 className="mt-3 font-display text-[1.9rem] leading-[1.05]">{gift.name}</h2>{gift.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">{gift.description}</p>}<div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4"><div><p className="eyebrow text-stone-500">Estimated</p><p className="mt-1 text-sm font-bold">{gift.estimated_price == null ? "Price not set" : eur(gift.estimated_price)}</p></div>{gift.product_url && <a href={gift.product_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex items-center gap-1 text-sm font-semibold text-sage-700 underline underline-offset-4 hover:text-foreground">View product <ExternalLink size={14}/></a>}</div></div></article>)}</div></> : <Card className="py-16 text-center"><Gift className="mx-auto text-sage-600" strokeWidth={1.4}/><h2 className="mt-5 font-display text-3xl">A collection in the making.</h2><p className="mt-3 text-sm text-stone-600">Check back later for new ideas.</p></Card>}
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border py-7 text-xs text-stone-500"><span>Giftly · A little more care in every gift</span><Link href="/" className="inline-flex items-center gap-1 font-semibold text-sage-700 hover:underline">Explore Giftly <ArrowUpRight size={14}/></Link></footer>
  </div></main>;
}
