"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Link2, Trash2 } from "lucide-react";
import { createShare, revokeShare, type ShareScope } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, Input } from "@/components/ui/input";
import type { Event, Person, SharedList } from "@/lib/types";
import { dateLabel } from "@/lib/utils";

export function SharingPanel({ people, events, shares }: { people: Person[]; events: Event[]; shares: SharedList[] }) {
  const [selection, setSelection] = useState("all");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function create() {
    setError(""); setUrl(""); setCopied(false);
    const [scope, id] = selection.split(":") as [ShareScope, string | undefined];
    start(async () => {
      const result = await createShare(scope, id || null);
      if (result.error) setError(result.error);
      else if (result.token) {
        setUrl(`${window.location.origin}/share/${result.token}`);
        router.refresh();
      }
    });
  }
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setError("Copy failed. Select the link and copy it manually."); }
  }
  function revoke(id: string) {
    if (!window.confirm("Revoke this link? People with the link will no longer be able to open it.")) return;
    setError("");
    start(async () => {
      const result = await revokeShare(id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }
  function label(share: SharedList) {
    if (share.event_id) return `Event: ${events.find(e => e.id === share.event_id)?.title || "Event list"}`;
    if (share.person_id) return `Person: ${people.find(p => p.id === share.person_id)?.name || "Person list"}`;
    return "All gifts";
  }

  return <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
    <div className="space-y-6">
      <Card className="p-7 sm:p-9">
        <div className="mb-8 flex items-start gap-4"><span className="rounded-lg bg-sage-100 p-3 text-sage-700"><Link2 size={21} strokeWidth={1.6}/></span><div><p className="eyebrow mb-2 text-sage-700">A thoughtful invitation</p><h2 className="font-display text-3xl leading-none">Create a read-only link</h2><p className="mt-3 text-sm leading-6 text-stone-600">Choose the collection you would like to share.</p></div></div>
        <label className="block space-y-2 text-sm font-semibold text-stone-700"><span>Gift list</span>
          <Select value={selection} onChange={e => setSelection(e.target.value)}>
            <option value="all">All gifts</option>
            <optgroup label="Events">{events.map(event => <option key={event.id} value={`event:${event.id}`}>{event.title}</option>)}</optgroup>
            <optgroup label="People">{people.map(person => <option key={person.id} value={`person:${person.id}`}>{person.name}</option>)}</optgroup>
          </Select>
        </label>
        <Button onClick={create} disabled={pending} className="mt-5">{pending ? "Working..." : "Create share link"}</Button>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {url && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p role="status" className="mb-2 text-sm font-semibold text-emerald-800">Your link is ready. Save it now; it is shown only once.</p><div className="flex gap-2"><Input readOnly value={url} onFocus={e => e.target.select()} aria-label="New share link"/><Button onClick={copy} type="button" variant="outline"><Copy size={16}/>{copied ? "Copied" : "Copy"}</Button></div><a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sage-700 hover:underline">Preview public list <ExternalLink size={14}/></a></div>}
      </Card>
      <Card className="p-7 sm:p-9"><p className="eyebrow mb-2 text-sage-700">Manage access</p><h2 className="font-display text-3xl">Active links</h2><p className="mb-5 mt-3 text-sm leading-6 text-stone-600">Previously created links stay active until revoked. Create a new link if you no longer have its URL.</p>
        {shares.length ? <div className="divide-y divide-stone-100">{shares.map(share => <div key={share.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-semibold">{label(share)}</p><p className="mt-1 text-xs text-stone-500">Created {dateLabel(share.created_at)}</p></div><Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => revoke(share.id)}><Trash2 size={15}/>Revoke</Button></div>)}</div> : <p className="py-5 text-center text-sm text-stone-500">No active links yet.</p>}
      </Card>
    </div>
    <Card className="h-fit bg-surface-muted p-7 sm:p-8"><p className="eyebrow mb-3 text-sage-700">Good to know</p><h2 className="font-display text-3xl">What viewers can see</h2><p className="mt-4 text-sm leading-7 text-stone-700">The public list shows gift names, descriptions, estimated prices, product links, and statuses. Event lists also show the event title and date. Person lists include only gifts assigned to that person; the person&apos;s profile and name stay private.</p><p className="mt-4 border-t border-border pt-4 text-sm leading-7 text-stone-700">Anyone with a link can open it. Revoking a link removes access immediately.</p></Card>
  </div>;
}
