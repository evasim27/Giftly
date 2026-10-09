import test from "node:test";
import assert from "node:assert/strict";
import { MAX_GIFT_IMAGE_BYTES, externalImageUrl, ownImagePath, validateImageFile, withGiftImageUrls } from "../src/lib/gift-images.ts";

const jpg = [0xff, 0xd8, 0xff, 0xe0];
const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const webp = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];
const file = (bytes, mime) => new Blob([Uint8Array.from(bytes)], { type: mime });

test("accepts JPG, PNG, and WebP by file contents", async () => {
  for (const [bytes, mime, name] of [[jpg, "image/jpeg", "photo.jpg"], [png, "image/png", "photo.png"], [webp, "image/webp", "photo.webp"]]) {
    assert.deepEqual(await validateImageFile(file(bytes, mime), name), { mime, extension: name.split(".").pop() });
  }
});

test("rejects unsupported, disguised, empty, and oversized files", async () => {
  assert.match((await validateImageFile(file([37, 80, 68, 70], "application/pdf"), "file.pdf")).error, /JPG, PNG, or WebP/);
  assert.match((await validateImageFile(file([37, 80, 68, 70], "image/png"), "file.png")).error, /contents/);
  assert.match((await validateImageFile(file([], "image/png"), "file.png")).error, /Choose/);
  assert.match((await validateImageFile(new Blob([new Uint8Array(MAX_GIFT_IMAGE_BYTES + 1)]), "file.jpg")).error, /5 MB/);
});

test("accepts only credential-free HTTPS image URLs", () => {
  assert.equal(externalImageUrl("https://example.com/gift.png"), "https://example.com/gift.png");
  assert.equal(externalImageUrl("http://example.com/gift.png"), null);
  assert.equal(externalImageUrl("javascript:alert(1)"), null);
  assert.equal(externalImageUrl("https://user:pass@example.com/gift.png"), null);
});

test("validates user-specific paths and signs only the owner's uploads", async () => {
  const alice = "11111111-1111-4111-8111-111111111111";
  const bob = "22222222-2222-4222-8222-222222222222";
  const path = `${alice}/33333333-3333-4333-8333-333333333333.webp`;
  assert.equal(ownImagePath(path, alice), true);
  assert.equal(ownImagePath(path, bob), false);
  const signed = [];
  const client = { storage: { from: () => ({ createSignedUrls: async paths => { signed.push(...paths); return { data: paths.map(path => ({ signedUrl: `https://signed.example/${path}` })) }; } }) } };
  const gifts = [{ id: "a", user_id: alice, image_path: path, image_url: null }, { id: "b", user_id: bob, image_path: path, image_url: null }, { id: "c", user_id: alice, image_path: null, image_url: "https://example.com/gift.png" }];
  const result = await withGiftImageUrls(client, gifts);
  assert.deepEqual(signed, [path]);
  assert.ok(result[0].display_image_url.startsWith("https://signed.example/"));
  assert.equal(result[1].display_image_url, null);
  assert.equal(result[2].display_image_url, "https://example.com/gift.png");
});
