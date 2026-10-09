import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gift } from "@/lib/types";

export const GIFT_IMAGE_BUCKET = "gift-images";
export const MAX_GIFT_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_URL_SECONDS = 300;

const extensions: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function externalImageUrl(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function ownImagePath(path: string, userId: string): boolean {
  return new RegExp(`^${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$`).test(path);
}

export async function validateImageFile(file: Blob, filename: string, checkMime = true): Promise<{ mime: string; extension: string } | { error: string }> {
  if (!file.size) return { error: "Choose an image file." };
  if (file.size > MAX_GIFT_IMAGE_BYTES) return { error: "Images must be 5 MB or smaller." };
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  const expected = extensions[extension === "jpeg" ? "jpg" : extension];
  if (!expected) return { error: "Use a JPG, PNG, or WebP image." };
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const detected = jpg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
  if (detected !== expected) return { error: "The file contents do not match a supported image format." };
  if (checkMime && file.type && file.type !== detected) return { error: "The file type does not match the image contents." };
  return { mime: detected, extension: extension === "jpeg" ? "jpg" : extension };
}

export async function withGiftImageUrls(supabase: SupabaseClient, gifts: Gift[]): Promise<Gift[]> {
  const paths = [...new Set(gifts.filter(gift => gift.image_path && ownImagePath(gift.image_path, gift.user_id)).map(gift => gift.image_path!))];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(GIFT_IMAGE_BUCKET).createSignedUrls(paths, IMAGE_URL_SECONDS);
    data?.forEach((item, index) => { if (item.signedUrl) signed.set(paths[index], item.signedUrl); });
  }
  return gifts.map(gift => ({ ...gift, display_image_url: gift.image_path ? (ownImagePath(gift.image_path, gift.user_id) ? signed.get(gift.image_path) || null : null) : externalImageUrl(gift.image_url) }));
}
