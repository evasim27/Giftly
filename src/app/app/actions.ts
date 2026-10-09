"use server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { externalImageUrl, GIFT_IMAGE_BUCKET, ownImagePath, validateImageFile } from "@/lib/gift-images";
import type { ActionState } from "@/lib/types";

export type EntityKind = "people" | "events" | "gifts";
export type ShareScope = "all" | "event" | "person";
const idSchema = z.uuid();
const optionalId = z.union([z.literal(""), z.uuid()]).transform(v => v || null);
const money = z.union([z.literal(""), z.coerce.number().min(0).max(9999999999.99)]).transform(v => v === "" ? null : v);
const optionalText = (max: number) => z.string().trim().max(max);
const personSchema = z.object({ name: z.string().trim().min(1).max(120), relationship: optionalText(80), birthday: z.union([z.literal(""), z.iso.date()]).transform(v => v || null), notes: optionalText(2000), budget: money });
const eventSchema = z.object({ title: z.string().trim().min(1).max(120), event_date: z.iso.date(), description: optionalText(2000), budget: money });
const giftSchema = z.object({ name: z.string().trim().min(1).max(160), description: optionalText(3000), estimated_price: money, actual_price: money, product_url: z.union([z.literal(""), z.url().refine(v => /^https?:\/\//i.test(v), "Use an HTTP or HTTPS URL.")]).transform(v => v || null), status: z.enum(["idea", "planned", "purchased", "gifted"]), person_id: optionalId, event_id: optionalId, image_action: z.enum(["keep", "remove", "url", "upload"]).default("keep"), image_url: z.string().trim().max(2048).default(""), image_path: z.string().default("") });
const tablePath = { people: "/app/people", events: "/app/events", gifts: "/app/gifts" };
function values(form: FormData) { return Object.fromEntries(form.entries()); }
function message(error: { message: string } | null) { return error?.message || "Something went wrong. Please try again."; }

async function removeUnusedGiftImage(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, path: string | null) {
  if (!path || !ownImagePath(path, userId)) return;
  const { count, error } = await supabase.from("gifts").select("id", { head: true, count: "exact" }).eq("user_id", userId).eq("image_path", path);
  if (!error && count === 0) await supabase.storage.from(GIFT_IMAGE_BUCKET).remove([path]);
}

export async function saveEntity(kind: EntityKind, id: string | null, _: ActionState, form: FormData): Promise<ActionState> {
  if (!(["people", "events", "gifts"] as string[]).includes(kind)) return { error: "Invalid item type." };
  if (id && !idSchema.safeParse(id).success) return { error: "Invalid item." };
  const parsed = (kind === "people" ? personSchema : kind === "events" ? eventSchema : giftSchema).safeParse(values(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await requireUser();
  let savedId = id;
  if (kind === "people") {
    const { budget, ...person } = parsed.data as z.infer<typeof personSchema>;
    const query = id ? supabase.from("people").update(person).eq("id", id).eq("user_id", user.id) : supabase.from("people").insert({ ...person, user_id: user.id });
    const { data, error } = await query.select("id").single();
    if (error || !data) return { error: message(error) };
    savedId = data.id;
    if (budget === null) {
      const { error: budgetError } = await supabase.from("person_budgets").delete().eq("person_id", savedId).eq("user_id", user.id);
      if (budgetError) return { error: message(budgetError) };
    } else {
      const { error: budgetError } = await supabase.from("person_budgets").upsert({ person_id: savedId, user_id: user.id, amount: budget }, { onConflict: "person_id" });
      if (budgetError) return { error: message(budgetError) };
    }
  } else if (kind === "events") {
    const payload = parsed.data as z.infer<typeof eventSchema>;
    const existing = id ? await supabase.from("events").select("birthday_person_id").eq("id", id).eq("user_id", user.id).maybeSingle() : null;
    if (id && !existing?.data) return { error: "Event not found." };
    const changes = existing?.data?.birthday_person_id ? { description: payload.description, budget: payload.budget } : payload;
    const query = id ? supabase.from("events").update(changes).eq("id", id).eq("user_id", user.id) : supabase.from("events").insert({ ...payload, user_id: user.id });
    const { data, error } = await query.select("id").single();
    if (error || !data) return { error: message(error) };
    savedId = data.id;
  } else {
    const payload = parsed.data as z.infer<typeof giftSchema>;
    for (const [table, foreignId] of [["people", payload.person_id], ["events", payload.event_id]] as const) {
      if (foreignId) { const { data } = await supabase.from(table).select("id").eq("id", foreignId).eq("user_id", user.id).maybeSingle(); if (!data) return { error: `Invalid ${table === "people" ? "person" : "event"} selection.` }; }
    }
    const { data: existing } = id ? await supabase.from("gifts").select("image_url,image_path").eq("id", id).eq("user_id", user.id).maybeSingle() : { data: null };
    if (id && !existing) return { error: "Gift not found." };
    const { image_action, image_url, image_path, ...giftFields } = payload;
    let nextImageUrl: string | null = existing?.image_url || null;
    let nextImagePath: string | null = existing?.image_path || null;
    if (image_action === "remove") { nextImageUrl = null; nextImagePath = null; }
    if (image_action === "url") {
      nextImageUrl = externalImageUrl(image_url);
      if (!nextImageUrl) return { error: "Use a direct HTTPS image URL." };
      nextImagePath = null;
    }
    if (image_action === "upload") {
      if (!ownImagePath(image_path, user.id)) return { error: "Invalid uploaded image path." };
      const { data: file, error: fileError } = await supabase.storage.from(GIFT_IMAGE_BUCKET).download(image_path);
      if (fileError || !file) return { error: "Uploaded image could not be verified. Try uploading it again." };
      const checked = await validateImageFile(file, image_path, false);
      if ("error" in checked) return { error: checked.error };
      nextImageUrl = null;
      nextImagePath = image_path;
    }
    const query = id ? supabase.from("gifts").update({ ...giftFields, image_url: nextImageUrl, image_path: nextImagePath }).eq("id", id).eq("user_id", user.id) : supabase.from("gifts").insert({ ...giftFields, image_url: nextImageUrl, image_path: nextImagePath, user_id: user.id });
    const { data, error } = await query.select("id").single();
    if (error || !data) {
      if (image_action === "upload") await removeUnusedGiftImage(supabase, user.id, image_path);
      return { error: message(error) };
    }
    savedId = data.id;
    if (existing?.image_path && existing.image_path !== nextImagePath) await removeUnusedGiftImage(supabase, user.id, existing.image_path);
  }
  revalidatePath(tablePath[kind]);
  if (kind === "people") { revalidatePath("/app/events"); revalidatePath("/app/sharing"); }
  revalidatePath("/app");
  if (kind === "gifts") return { savedId: savedId! };
  if (!id) redirect(`${tablePath[kind]}?added=1`, RedirectType.replace);
  redirect(`${tablePath[kind]}/${savedId}?saved=1`);
}

export async function deleteEntity(kind: EntityKind, id: string): Promise<ActionState> {
  if (!(["people", "events", "gifts"] as string[]).includes(kind) || !idSchema.safeParse(id).success) return { error: "Invalid item." };
  const { supabase, user } = await requireUser();
  if (kind === "events") {
    const { data: event } = await supabase.from("events").select("birthday_person_id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (event?.birthday_person_id) return { error: "Remove the birthday from the person to remove this event." };
  }
  const { data: gift } = kind === "gifts" ? await supabase.from("gifts").select("image_path").eq("id", id).eq("user_id", user.id).maybeSingle() : { data: null };
  const { data, error } = await supabase.from(kind).delete().eq("id", id).eq("user_id", user.id).select("id").single();
  if (error || !data) return { error: message(error) };
  if (kind === "gifts" && gift?.image_path) await removeUnusedGiftImage(supabase, user.id, gift.image_path);
  revalidatePath(tablePath[kind]); revalidatePath("/app");
  if (kind === "people") { revalidatePath("/app/events"); revalidatePath("/app/sharing"); }
  if (kind === "events" || kind === "people") revalidatePath("/app/gifts");
  return { success: "Deleted." };
}

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.string().trim().min(1).max(80).safeParse(form.get("display_name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: parsed.data }, { onConflict: "id" });
  if (error) return { error: error.message };
  revalidatePath("/app/profile"); revalidatePath("/app");
  return { success: "Profile updated." };
}

export async function createShare(scope: ShareScope, scopeId: string | null): Promise<{ error?: string; token?: string }> {
  if (!["all", "event", "person"].includes(scope) || (scope === "all" ? scopeId !== null : !idSchema.safeParse(scopeId).success)) return { error: "Invalid list selection." };
  const { supabase, user } = await requireUser();
  if (scope !== "all") { const table = scope === "event" ? "events" : "people"; const { data } = await supabase.from(table).select("id").eq("id", scopeId!).eq("user_id", user.id).maybeSingle(); if (!data) return { error: `${scope === "event" ? "Event" : "Person"} not found.` }; }
  const token = randomBytes(32).toString("hex");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.from("shared_lists").insert({ user_id: user.id, event_id: scope === "event" ? scopeId : null, person_id: scope === "person" ? scopeId : null, token_hash });
  if (error) return { error: error.message };
  revalidatePath("/app/sharing");
  return { token };
}
export async function revokeShare(id: string): Promise<ActionState> {
  if (!idSchema.safeParse(id).success) return { error: "Invalid link." };
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("shared_lists").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).is("revoked_at", null).select("id").single();
  if (error || !data) return { error: message(error) };
  revalidatePath("/app/sharing");
  return { success: "Link revoked." };
}
