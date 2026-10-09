"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowUpRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GiftVisual } from "@/components/gift-card";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/app/auth-actions";

type Mode = "login" | "register" | "forgot" | "reset";
const actions = { login: loginAction, register: registerAction, forgot: forgotPasswordAction, reset: resetPasswordAction };
const titles = { login: "Welcome back.", register: "Begin with care.", forgot: "A fresh start.", reset: "A new password." };
const subtitles = { login: "Your thoughtful little corner is waiting.", register: "Make space for all the good ideas to come.", forgot: "We'll send a reset link to your inbox.", reset: "Choose a password with at least 8 characters." };

export function AuthForm({ mode, next, error }: { mode: Mode; next?: string; error?: string }) {
  const [state, action, pending] = useActionState(actions[mode], {});
  return <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_1fr]">
    <aside className="hidden min-h-screen flex-col justify-between bg-[#EAE9E1] p-10 lg:flex xl:p-14"><Link href="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-200 text-sage-700"><Gift size={19} strokeWidth={1.6}/></span><span className="font-display text-[2rem] leading-none">giftly<span className="text-sage-600">.</span></span></Link><div className="mx-auto w-full max-w-lg"><p className="eyebrow mb-5 text-sage-700">The art of giving well</p><h2 className="font-display text-[4.5rem] leading-[.93] tracking-[-.025em] xl:text-[5.5rem]">A beautiful place for <em>thoughtful things.</em></h2><p className="mt-6 max-w-sm text-sm leading-7 text-stone-600">Ideas, people, occasions, and all the details that make a gift feel like yours.</p><div className="mt-10 grid grid-cols-[.86fr_1.14fr] items-end gap-4"><div className="overflow-hidden rounded-xl border border-[#D5D1C8] bg-white"><GiftVisual name="Something lovely" visualKey="auth-note" height={200}/></div><div className="overflow-hidden rounded-xl border border-[#D5D1C8] bg-white"><GiftVisual name="A thoughtful gift" visualKey="auth-gift" height={260}/></div></div></div><p className="eyebrow text-stone-500">Private by default · Shared with intention</p></aside>
    <section className="flex min-h-screen flex-col px-5 py-7 sm:px-10 lg:px-14"><div className="lg:hidden"><Link href="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-100 text-sage-700"><Gift size={18}/></span><span className="font-display text-[2rem]">giftly.</span></Link></div><div className="m-auto w-full max-w-md py-12"><p className="eyebrow mb-5 text-sage-700">{mode === "login" ? "Your collection awaits" : mode === "register" ? "A thoughtful beginning" : "Your account"}</p><h1 className="font-display text-[3.4rem] leading-none tracking-[-.02em] sm:text-[4rem]">{titles[mode]}</h1><p className="mt-4 text-sm leading-7 text-stone-600">{subtitles[mode]}</p>
      <form action={action} className="mt-10 space-y-5">{next && <input type="hidden" name="next" value={next}/>}
        {mode === "register" && <Field label="Display name" name="display_name" type="text" autoComplete="name"/>}
        {mode !== "reset" && <Field label="Email address" name="email" type="email" autoComplete="email"/>}
        {(mode === "register" || mode === "login" || mode === "reset") && <Field label="Password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 8}/>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Your email link is invalid or expired. Please request a new one.</p>}
        {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
        {state.success && <p role="status" className="rounded-lg border border-sage-200 bg-sage-50 p-3 text-sm text-sage-700">{state.success}</p>}
        <Button className="mt-2 w-full" size="lg" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Log in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Save new password"}<ArrowUpRight size={16}/></Button>
      </form>
      {mode === "login" && <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm"><Link href="/forgot-password" className="font-semibold text-sage-700 hover:underline">Forgot password?</Link><Link href="/register" className="font-semibold text-sage-700 hover:underline">Create an account</Link></div>}
      {mode === "register" && <p className="mt-6 text-sm text-stone-600">Already have an account? <Link href="/login" className="font-semibold text-sage-700 hover:underline">Log in</Link></p>}
      {(mode === "forgot" || mode === "reset") && <p className="mt-6 text-sm"><Link href="/login" className="font-semibold text-sage-700 hover:underline">Back to login</Link></p>}
    </div><p className="text-center text-xs text-stone-500">Giftly · A little more care in every gift</p></section>
  </main>;
}

function Field({ label, name, type, autoComplete, minLength }: { label: string; name: string; type: string; autoComplete: string; minLength?: number }) { return <label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>{label}</span><Input name={name} type={type} autoComplete={autoComplete} minLength={minLength} required className="h-12"/></label>; }
