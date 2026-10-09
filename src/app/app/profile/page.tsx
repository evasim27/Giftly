import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";

export default async function Page({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const { updated } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = data?.display_name || user.email?.split("@")[0] || "You";
  return <><PageHeader eyebrow="Your account" title="A little about you." description="Keep your gifting space personal, just like the gifts you plan."/>
    {updated && <p role="status" className="mb-5 rounded-lg border border-sage-200 bg-sage-50 p-3 text-sm text-sage-700">Password updated successfully.</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)]"><Card className="p-7 sm:p-9"><p className="eyebrow mb-3 text-sage-700">Personal details</p><h2 className="mb-8 font-display text-3xl">How should we call you?</h2><ProfileForm name={data?.display_name || ""}/><div className="mt-10 border-t border-border pt-6"><p className="eyebrow text-stone-500">Email address</p><p className="mt-2 break-all text-sm font-semibold">{user.email}</p><p className="mt-5 text-sm text-stone-600">Need a new password? <Link href="/forgot-password" className="font-semibold text-sage-700 underline underline-offset-4">Request a reset link</Link>.</p></div></Card><div className="flex min-h-64 flex-col justify-between rounded-xl border border-sage-200 bg-sage-100 p-7 sm:p-9"><p className="eyebrow text-sage-700">Your space</p><div><span className="font-display text-[7rem] leading-none text-sage-700/70">{displayName.slice(0,1).toUpperCase()}</span><h2 className="mt-2 font-display text-3xl">{displayName}</h2><p className="mt-3 max-w-xs text-sm leading-7 text-stone-600">A collection shaped by the people and moments that matter to you.</p></div></div></div>
  </>;
}
