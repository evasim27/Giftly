"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Gift, LayoutDashboard, LogOut, Menu, Share2, Users, UserRound, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/auth-actions";

const nav = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/gifts", label: "Gift ideas", icon: Gift },
  { href: "/app/people", label: "People", icon: Users },
  { href: "/app/events", label: "Occasions", icon: CalendarDays },
  { href: "/app/sharing", label: "Shared lists", icon: Share2 },
];

function Navigation({ close }: { close?: () => void }) {
  const path = usePathname();
  return <nav aria-label="Main navigation" className="space-y-1">{nav.map(item => {
    const Icon = item.icon;
    const active = item.href === "/app" ? path === "/app" : path.startsWith(item.href);
    return <Link onClick={close} key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("group flex items-center gap-3 rounded-lg border px-3.5 py-3 text-sm font-semibold transition-colors", active ? "border-border bg-white text-foreground" : "border-transparent text-stone-600 hover:bg-white/70 hover:text-foreground")}><Icon size={17} strokeWidth={active ? 2 : 1.7} className={active ? "text-sage-600" : "text-stone-500 group-hover:text-sage-600"}/>{item.label}</Link>;
  })}</nav>;
}

function Brand() { return <Link href="/app" className="flex items-center gap-3 text-foreground"><span className="flex h-10 w-10 items-center justify-center rounded-lg border border-sage-300 bg-sage-100 text-sage-700"><Gift size={20} strokeWidth={1.6}/></span><span className="font-display text-[2rem] leading-none tracking-[-.03em]">giftly<span className="text-sage-600">.</span></span></Link>; }

export function AppShell({ children, displayName, email }: { children: React.ReactNode; displayName: string; email: string }) {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen bg-background lg:flex">
    <aside className="hidden w-[254px] shrink-0 flex-col border-r border-border bg-[#F3F1EB] px-5 py-8 lg:flex">
      <div className="px-2"><Brand/><p className="eyebrow mt-3 text-stone-500">The thoughtful planner</p></div>
      <div className="mt-14"><p className="eyebrow mb-4 px-3.5 text-stone-500">Your space</p><Navigation/></div>
      <div className="mt-auto border-t border-border pt-5"><Link href="/app/profile" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-200 text-sm font-bold text-sage-700">{displayName.slice(0,1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-foreground">{displayName}</span><span className="block truncate text-xs text-stone-500">{email}</span></span></Link><form action={logoutAction}><button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-white hover:text-foreground"><LogOut size={17} strokeWidth={1.7}/>Log out</button></form></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex h-[72px] items-center justify-between border-b border-border bg-background px-5 lg:hidden"><Brand/><button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="rounded-lg border border-border bg-white p-2.5 text-foreground">{open ? <X size={19}/> : <Menu size={19}/>}</button></header>
      {open && <div id="mobile-navigation" className="border-b border-border bg-[#F3F1EB] px-5 py-5 lg:hidden"><Navigation close={() => setOpen(false)}/><div className="mt-4 border-t border-border pt-3"><Link onClick={() => setOpen(false)} href="/app/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-foreground"><UserRound size={17}/>Profile</Link><form action={logoutAction}><button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-stone-600"><LogOut size={17}/>Log out</button></form></div></div>}
      <div className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 sm:py-12 xl:px-14 xl:py-14">{children}</div>
    </div>
  </div>;
}
