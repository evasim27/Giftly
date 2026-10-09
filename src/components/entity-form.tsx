"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Trash2, X } from "lucide-react";
import { saveEntity, deleteEntity, type EntityKind } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { Event, Person } from "@/lib/types";
import { createClient } from "@/lib/supabase/browser";
import { externalImageUrl, GIFT_IMAGE_BUCKET, validateImageFile } from "@/lib/gift-images";
import { GiftVisual } from "@/components/gift-card";

type Props = {
  kind: EntityKind;
  id?: string | null;
  initial?: Record<string, unknown>;
  budget?: number | null;
  people?: Person[];
  events?: Event[];
  preset?: { person_id?: string; event_id?: string };
  birthdayPersonId?: string | null;
  initialImageUrl?: string | null;
};

export function EntityForm({ kind, id = null, initial, budget, people = [], events = [], preset, birthdayPersonId, initialImageUrl }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveEntity.bind(null, kind, id), {});
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [giftError, setGiftError] = useState("");
  const [imageError, setImageError] = useState("");
  const [savingGift, setSavingGift] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const [imageAction, setImageAction] = useState<"keep" | "remove" | "url" | "upload">("keep");
  const [imageUrlText, setImageUrlText] = useState(String(initial?.image_url || ""));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const get = (key: string) => String(initial?.[key] ?? "");
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  function clearPreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setLocalPreview(null);
  }

  async function chooseImage(file: File | null) {
    if (!file) return;
    setCheckingImage(true); setImageError("");
    try {
      const result = await validateImageFile(file, file.name);
      if ("error" in result) { setImageError(result.error); return; }
      clearPreview();
      previewUrl.current = URL.createObjectURL(file);
      setLocalPreview(previewUrl.current);
      setImageFile(file); setImageAction("upload"); setImageUrlText("");
    } catch { setImageError("Could not read this image. Try another file."); }
    finally { setCheckingImage(false); }
  }

  async function submitGift(form: FormData) {
    setGiftError(""); setImageError(""); setSavingGift(true);
    const supabase = createClient();
    let stagedPath: string | null = null;
    try {
      if (imageAction === "upload") {
        if (!imageFile) { setImageError("Choose an image to upload."); return; }
        const checked = await validateImageFile(imageFile, imageFile.name);
        if ("error" in checked) { setImageError(checked.error); return; }
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { setGiftError("Your session expired. Log in and try again."); return; }
        stagedPath = `${user.id}/${crypto.randomUUID()}.${checked.extension}`;
        const { error: uploadError } = await supabase.storage.from(GIFT_IMAGE_BUCKET).upload(stagedPath, imageFile, { contentType: checked.mime, upsert: false });
        if (uploadError) { setImageError(`Upload failed: ${uploadError.message}`); return; }
      }
      form.set("image_action", imageAction);
      form.set("image_url", imageAction === "url" ? imageUrlText : "");
      form.set("image_path", stagedPath || "");
      const result = await new Promise<Awaited<ReturnType<typeof saveEntity>>>((resolve, reject) => {
        startTransition(() => { void saveEntity("gifts", id, {}, form).then(resolve, reject); });
      });
      if (result.error) {
        if (stagedPath) await supabase.storage.from(GIFT_IMAGE_BUCKET).remove([stagedPath]);
        setGiftError(result.error);
        return;
      }
      if (result.savedId) {
        if (id) router.push(`/app/gifts/${result.savedId}?saved=1`);
        else router.replace("/app/gifts?added=1");
      }
    } catch {
      if (stagedPath) await supabase.storage.from(GIFT_IMAGE_BUCKET).remove([stagedPath]);
      setGiftError("Could not save this gift. Please try again.");
    } finally { setSavingGift(false); }
  }
  async function remove() {
    if (!id || !window.confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteEntity(kind, id);
    setDeleting(false);
    if (result.error) setDeleteError(result.error);
    else router.push(`/app/${kind}`);
  }

  const preview = imageAction === "upload" ? localPreview : imageAction === "url" ? externalImageUrl(imageUrlText) : imageAction === "keep" ? initialImageUrl : null;
  return <Card className="max-w-3xl p-7 sm:p-9"><form action={kind === "gifts" ? submitGift : action} className="space-y-6">
    {kind === "people" && <>
      <Field label="Name" name="name" required defaultValue={get("name")} maxLength={120}/>
      <Field label="Relationship" name="relationship" defaultValue={get("relationship")} maxLength={80} placeholder="Friend, sister, colleague…"/>
      <div><Field label="Birthday" name="birthday" type="date" defaultValue={get("birthday")}/><p className="mt-2 text-xs text-stone-500">A birthday automatically appears as an annual event.</p></div>
      <Field label="Budget (€)" name="budget" type="number" min="0" step="0.01" defaultValue={budget == null ? "" : String(budget)} placeholder="Optional"/>
      <TextField label="Notes" name="notes" defaultValue={get("notes")} maxLength={2000} placeholder="Things they love, sizes, hints…"/>
    </>}
    {kind === "events" && <>
      {birthdayPersonId && <p className="rounded-lg border border-sage-200 bg-sage-50 p-4 text-sm leading-6 text-sage-700">This birthday repeats every year. Change its name or date on the <Link href={`/app/people/${birthdayPersonId}`} className="font-semibold underline">person&apos;s page</Link>. You can edit its budget and description here.</p>}
      <Field label="Event name" name="title" required readOnly={!!birthdayPersonId} defaultValue={get("title")} maxLength={120} placeholder="Birthday, graduation…" className={birthdayPersonId ? "bg-stone-50" : ""}/>
      <Field label={birthdayPersonId ? "Next birthday" : "Date"} name="event_date" type="date" required readOnly={!!birthdayPersonId} defaultValue={get("event_date")} className={birthdayPersonId ? "bg-stone-50" : ""}/>
      <Field label="Budget (€)" name="budget" type="number" min="0" step="0.01" defaultValue={get("budget")} placeholder="Optional"/>
      <TextField label="Description" name="description" defaultValue={get("description")} maxLength={2000}/>
    </>}
    {kind === "gifts" && <>
      <Field label="Gift name" name="name" required defaultValue={get("name")} maxLength={160} placeholder="A thoughtful gift idea"/>
      <section aria-label="Gift image" className="space-y-4 rounded-xl border border-border bg-background p-5 sm:p-6">
        <div><p className="eyebrow text-sage-700">Visual note</p><h2 className="mt-2 font-display text-2xl">Gift image</h2><p className="mt-1 text-xs leading-5 text-stone-600">Add a JPG, PNG, or WebP up to 5 MB, or paste a direct HTTPS image URL. Optional.</p></div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void chooseImage(event.dataTransfer.files[0] || null); }} className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-sage-300 bg-white p-4 text-center">
            <ImagePlus size={22} strokeWidth={1.5} className="text-sage-700"/><p className="mt-2 text-sm font-semibold">Drop an image here</p><p className="mt-1 text-xs text-stone-500">or choose a file</p>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose gift image" onChange={event => { void chooseImage(event.target.files?.[0] || null); event.target.value = ""; }}/>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => fileInput.current?.click()} disabled={checkingImage || savingGift}>Upload image</Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-white"><GiftVisual name={get("name") || "Gift image preview"} visualKey={id || "new-gift"} imageUrl={preview} height={170}/></div>
        </div>
        {imageAction === "upload" && imageFile && <p className="text-xs font-medium text-sage-700">Ready to upload: {imageFile.name}</p>}
        <label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>Image URL</span><Input type="url" value={imageUrlText} maxLength={2048} placeholder="https://example.com/image.jpg" onChange={event => { clearPreview(); setImageUrlText(event.target.value); setImageAction(event.target.value ? "url" : "remove"); setImageFile(null); setImageError(""); }}/></label>
        {(imageAction !== "remove" && Boolean(preview || imageFile || initial?.image_path || initial?.image_url)) && <Button type="button" variant="ghost" size="sm" onClick={() => { clearPreview(); setImageAction("remove"); setImageFile(null); setImageUrlText(""); setImageError(""); }}><X size={15}/>Remove image</Button>}
        {imageError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{imageError}</p>}
      </section>
      <TextField label="Description" name="description" defaultValue={get("description")} maxLength={3000} placeholder="Why they'll love it…"/>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Estimated price (€)" name="estimated_price" type="number" min="0" step="0.01" defaultValue={get("estimated_price")}/><Field label="Actual price (€)" name="actual_price" type="number" min="0" step="0.01" defaultValue={get("actual_price")}/></div>
      <Field label="Product URL" name="product_url" type="url" defaultValue={get("product_url")} maxLength={2048} placeholder="https://…"/>
      <div className="grid gap-5 sm:grid-cols-2"><label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>Person</span><Select name="person_id" defaultValue={get("person_id") || preset?.person_id || ""}><option value="">No person</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</Select></label><label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>Event</span><Select name="event_id" defaultValue={get("event_id") || preset?.event_id || ""}><option value="">No event</option>{events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</Select></label></div>
      <label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>Status</span><Select name="status" defaultValue={get("status") || "idea"}><option value="idea">Idea</option><option value="planned">Planned</option><option value="purchased">Purchased</option><option value="gifted">Gifted</option></Select></label>
    </>}
    {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    {giftError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{giftError}</p>}
    {deleteError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6"><Button type="submit" disabled={pending || savingGift || checkingImage}>{pending || savingGift ? "Saving…" : id ? "Save changes" : kind === "people" ? "Add a person" : kind === "events" ? "Add an occasion" : "Add a gift"}</Button><Button asChild type="button" variant="outline"><Link href={`/app/${kind}`}>Cancel</Link></Button>{id && !birthdayPersonId && <Button type="button" variant="danger" className="sm:ml-auto" disabled={deleting || savingGift} onClick={remove}><Trash2 size={16}/>{deleting ? "Deleting…" : "Delete"}</Button>}</div>
  </form></Card>;
}
function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>{label}</span><Input name={name} {...props}/></label>; }
function TextField({ label, name, ...props }: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <label className="block space-y-2 text-xs font-bold uppercase tracking-[.08em] text-foreground"><span>{label}</span><Textarea name={name} {...props}/></label>; }
