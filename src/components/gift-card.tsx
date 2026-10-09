"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Gift } from "@/lib/types";
import { eur } from "@/lib/utils";
import { StatusBadge } from "@/components/common";

const palettes = [
  { background: "#E7EADF", paper: "#F8F7F3", ink: "#6F816A", detail: "#C7D1C1" },
  { background: "#EAE6DE", paper: "#FCFAF5", ink: "#786F62", detail: "#D6C9B8" },
  { background: "#E8E3DE", paper: "#F8F5EF", ink: "#8A786B", detail: "#D8C8BC" },
  { background: "#E2E9E4", paper: "#F9F8F4", ink: "#667E76", detail: "#BDD0C4" },
];
function variantFor(key: string) { return Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length; }

export function GiftVisual({ name, visualKey, imageUrl, height }: { name: string; visualKey: string; imageUrl?: string | null; height?: number }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const variant = variantFor(visualKey);
  const colors = palettes[variant];
  const safeImage = typeof imageUrl === "string" && (/^https:\/\//i.test(imageUrl) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(imageUrl) || imageUrl.startsWith("blob:")) ? imageUrl : null;
  const visualHeight = height ?? [290, 245, 325, 270][variant];
  return <div className="relative isolate overflow-hidden" style={{ height: visualHeight, backgroundColor: colors.background }}>
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-[1.035]">
      <svg viewBox="0 0 320 360" className="h-full w-full max-w-96" preserveAspectRatio="xMidYMid meet">
        <circle cx="262" cy="56" r="86" fill={colors.detail} opacity=".34"/>
        <circle cx="38" cy="329" r="110" fill={colors.paper} opacity=".38"/>
        {variant === 0 && <><rect x="72" y="113" width="180" height="148" rx="7" fill={colors.paper} transform="rotate(-7 162 187)"/><path d="M68 161l181-23M160 103l18 160" stroke={colors.ink} strokeWidth="7" opacity=".65"/><path d="M167 112c-49-8-55-33-30-36 20-2 31 22 35 36 17-40 59-43 54-21-3 14-27 24-54 21" fill="none" stroke={colors.ink} strokeWidth="5" strokeLinecap="round"/></>}
        {variant === 1 && <><rect x="78" y="106" width="172" height="178" rx="5" fill={colors.paper} transform="rotate(8 164 195)"/><rect x="94" y="124" width="145" height="140" rx="3" fill={colors.detail} opacity=".6" transform="rotate(8 166 194)"/><path d="M130 222c16-70 40-99 88-130M152 173c-24-2-27-16-22-30 16 0 24 8 22 30Zm19-28c7-24 23-27 34-21-6 17-17 24-34 21Zm-33 59c-24-1-31-16-29-29 17-2 28 8 29 29Z" fill="none" stroke={colors.ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></>}
        {variant === 2 && <><ellipse cx="161" cy="245" rx="104" ry="20" fill={colors.ink} opacity=".12"/><rect x="84" y="100" width="154" height="144" rx="77" fill={colors.paper}/><circle cx="161" cy="174" r="55" fill={colors.detail} opacity=".72"/><path d="M161 116v117M105 174h112" stroke={colors.ink} strokeWidth="5" opacity=".56"/><path d="M148 118c-42-26-56-7-41 8 13 13 31 8 54-4 22-35 55-26 48-8-7 18-27 21-48 8" fill="none" stroke={colors.ink} strokeWidth="4"/></>}
        {variant === 3 && <><rect x="82" y="133" width="174" height="117" rx="7" fill={colors.paper} transform="rotate(-5 169 191)"/><rect x="91" y="118" width="158" height="46" rx="5" fill={colors.detail} transform="rotate(-5 170 141)"/><path d="M169 115l10 136" stroke={colors.ink} strokeWidth="6" opacity=".65"/><path d="M171 118c-29-39-59-45-63-27-4 19 28 30 63 27 22-44 55-42 56-22 1 18-31 26-56 22" fill="none" stroke={colors.ink} strokeWidth="4"/></>}
      </svg>
    </div>
    {safeImage && safeImage !== failedUrl && <Image src={safeImage} alt={name} unoptimized fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" referrerPolicy="no-referrer" onError={() => setFailedUrl(safeImage)} className="object-cover"/>}
    <span className="absolute bottom-4 left-4 rounded-md bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-foreground">Giftly notes</span>
  </div>;
}

export function GiftCard({ gift, recipient, event, compact = false }: { gift: Gift; recipient?: string | null; event?: string | null; compact?: boolean }) {
  const price = gift.actual_price ?? gift.estimated_price;
  return <article className="group overflow-hidden rounded-xl border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:border-sage-300 hover:shadow-[0_14px_28px_-22px_rgba(45,48,43,.38)]">
    <Link href={`/app/gifts/${gift.id}`} className="block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sage-600" aria-label={`Open ${gift.name} gift details`}>
      <GiftVisual name={gift.name} visualKey={gift.id} imageUrl={gift.display_image_url} height={compact ? 210 : undefined}/>
      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-center justify-between gap-2"><span className="eyebrow text-sage-700">Gift idea</span><StatusBadge status={gift.status}/></div>
        <h3 className="mt-3 font-display text-[1.8rem] leading-[1.05] text-foreground">{gift.name}</h3>
        <p className="mt-2 text-xs font-medium text-stone-600">For {recipient || "someone special"}{event ? ` · ${event}` : ""}</p>
        <div className="mt-5 flex items-end justify-between border-t border-border pt-4"><div><p className="eyebrow text-stone-500">{gift.actual_price == null ? "Estimated" : "Spent"}</p><p className="mt-1 text-base font-bold text-foreground">{price == null ? "Price not set" : eur(price)}</p></div><ArrowUpRight className="text-sage-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" size={19}/></div>
      </div>
    </Link>
  </article>;
}
