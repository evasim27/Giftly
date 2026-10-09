"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ProfileForm({ name }: { name: string }) { const [state, action, pending] = useActionState(updateProfile, {}); return <form action={action} className="space-y-6"><label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>Display name</span><Input name="display_name" defaultValue={name} required maxLength={80}/></label>{state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="rounded-lg border border-sage-200 bg-sage-50 p-3 text-sm text-sage-700">{state.success}</p>}<Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></form>; }
