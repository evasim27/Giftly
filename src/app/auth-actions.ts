"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const email = z.email().max(254);
const password = z.string().min(8, "Password must be at least 8 characters.").max(128);
function siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; }

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ display_name: z.string().trim().min(1).max(80), email, password }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { display_name: parsed.data.display_name }, emailRedirectTo: `${siteUrl()}/auth/callback?next=/app` } });
  if (error) return { error: error.message };
  if (data.session) redirect("/app");
  return { success: "Account created. Check your email for a confirmation link, then log in." };
}
export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({ email, password: z.string().min(1), next: z.string().optional() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { error: error.message };
  const next = parsed.data.next && /^\/app(?:\/[^\\]*)?$/.test(parsed.data.next) ? parsed.data.next : "/app";
  redirect(next);
}
export async function logoutAction() { const supabase = await createClient(); await supabase.auth.signOut(); redirect("/login"); }
export async function forgotPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  if (error) return { error: error.message };
  return { success: "If that address has an account, a password reset link is on its way." };
}
export async function resetPasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = password.safeParse(form.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.message };
  redirect("/app/profile?updated=1");
}
