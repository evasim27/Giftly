export type Person = { id: string; user_id: string; name: string; relationship: string; birthday: string | null; notes: string; created_at: string };
export type Event = { id: string; user_id: string; title: string; event_date: string; description: string; budget: number | null; birthday_person_id: string | null; created_at: string };
export type GiftStatus = "idea" | "planned" | "purchased" | "gifted";
export type Gift = { id: string; user_id: string; person_id: string | null; event_id: string | null; name: string; description: string; estimated_price: number | null; actual_price: number | null; product_url: string | null; image_url: string | null; image_path: string | null; display_image_url?: string | null; status: GiftStatus; created_at: string };
export type PersonBudget = { person_id: string; user_id: string; amount: number };
export type SharedList = { id: string; user_id: string; event_id: string | null; person_id: string | null; token_hash: string; created_at: string; revoked_at: string | null };
export type ActionState = { error?: string; success?: string; savedId?: string };
export const statuses: GiftStatus[] = ["idea", "planned", "purchased", "gifted"];
export function spent(gifts: Gift[]) { return gifts.filter(g => g.status === "purchased" || g.status === "gifted").reduce((sum, g) => sum + Number(g.actual_price ?? g.estimated_price ?? 0), 0); }
export function committed(gifts: Gift[]) { return gifts.filter(g => g.status !== "idea").reduce((sum, g) => sum + Number(g.actual_price ?? g.estimated_price ?? 0), 0); }
