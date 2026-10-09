import Link from "next/link";
import { ArrowUpRight, Gift, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, eur } from "@/lib/utils";
import type { GiftStatus } from "@/lib/types";

export function PageHeader({ eyebrow, title, description, action, href }: { eyebrow: string; title: string; description?: string; action?: string; href?: string }) {
  return <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8 sm:mb-12 sm:pb-10">
    <div><p className="eyebrow mb-4 text-sage-700">{eyebrow}</p><h1 className="max-w-3xl font-display text-[3rem] leading-[.98] tracking-[-.02em] text-foreground sm:text-[4rem]">{title}</h1>{description && <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">{description}</p>}</div>
    {action && href && <Button asChild><Link href={href}>{action}<ArrowUpRight size={16}/></Link></Button>}
  </header>;
}

export function AddedNotice({ item }: { item: string }) {
  return <p role="status" className="mb-6 rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-medium text-sage-700">{item} added successfully.</p>;
}

export function EmptyState({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return <Card className="flex flex-col items-center border-dashed px-6 py-16 text-center sm:py-20"><span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage-50 text-sage-600"><Gift size={26} strokeWidth={1.4}/></span><h2 className="font-display text-3xl text-foreground">{title}</h2><p className="mt-3 max-w-sm text-sm leading-7 text-stone-600">{description}</p>{href && action && <Button asChild className="mt-7"><Link href={href}>{action}<ArrowUpRight size={16}/></Link></Button>}</Card>;
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string; icon: LucideIcon; hint?: string }) {
  return <Card className="flex items-start justify-between gap-3"><div><p className="eyebrow text-stone-500">{label}</p><p className="mt-4 font-display text-4xl leading-none">{value}</p>{hint && <p className="mt-3 text-xs text-stone-500">{hint}</p>}</div><Icon size={20} strokeWidth={1.5} className="text-sage-600"/></Card>;
}

export function StatusBadge({ status }: { status: GiftStatus }) {
  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em]", status === "idea" && "border-stone-200 bg-stone-50 text-stone-600", status === "planned" && "border-sage-200 bg-sage-50 text-sage-700", status === "purchased" && "border-amber-200 bg-amber-50 text-amber-800", status === "gifted" && "border-sage-300 bg-sage-100 text-sage-700")}>{status}</span>;
}

export function BudgetMeter({ budget, spent, label }: { budget: number | null; spent: number; label?: string }) {
  if (budget === null) return <p className="text-sm text-stone-600">No budget set</p>;
  const percent = budget === 0 ? (spent > 0 ? 100 : 0) : Math.min(100, spent / budget * 100);
  return <div><div className="mb-3 flex flex-wrap justify-between gap-2 text-sm"><span className="text-stone-600">{label || "Spent"} <strong className="text-foreground">{eur(spent)}</strong> of {eur(budget)}</span><span className={spent > budget ? "font-semibold text-red-700" : "font-semibold text-sage-700"}>{eur(budget - spent)} left</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className={cn("h-full rounded-full", spent > budget ? "bg-red-600" : "bg-sage-500")} style={{ width: `${percent}%` }}/></div></div>;
}
