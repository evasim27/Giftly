# Giftly

Giftly is a private gift planner built with Next.js App Router, TypeScript, Tailwind CSS, shadcn-style UI components, Lucide icons, Supabase Auth/PostgreSQL, and npm. Users can organize people, events, gifts, and EUR budgets, then create revocable read-only public links.

## Local setup

Requires Node.js 20.9+ and a Supabase project.

1. Install dependencies: `npm ci`
2. Copy `.env.example` to `.env.local` and fill in the values from **Supabase → Connect → API keys**:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   The publishable key is used in the browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only and signs uploaded images for public shared lists after token validation. Never put it in a `NEXT_PUBLIC_` variable or commit `.env.local`.

3. Run the SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor. Apply each migration once. The first creates the schema and RLS policies; the second adds recurring birthday events and person-specific sharing; **`202610080003_gift_images.sql`** adds optional image columns, a private Storage bucket, and owner-only Storage policies. For an existing project that already has the first two migrations, run only the third file. No separate Storage dashboard setup is needed. For a Supabase CLI workflow, link your project and run `supabase db push` instead.
4. Under **Authentication → Providers → Email**, enable email/password and **Confirm email**.
5. Under **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL. Add your production callback URL when deploying.
6. Under **Authentication → Email Templates**, update the links in **Confirm signup** and **Reset password** to support server-side verification:

   ```html
   <!-- Confirm signup -->
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm your email</a>

   <!-- Reset password -->
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
   ```

   Giftly supplies a `RedirectTo` URL containing a `next` query parameter. The `/auth/callback` route exchanges the token hash for a cookie-backed session. Keep those template links intact for both local and production URLs.
7. Start the app with `npm run dev` and open `http://localhost:3000`.

## Commands

- `npm run dev` — development server
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
- `npm run start` — serve the production build

## Data and security

All private tables have Row Level Security. Every app mutation checks the authenticated user, validates input with Zod, and scopes updates/deletes to that user's ID. Database triggers reject cross-owner gift and sharing assignments. Sessions are refreshed in the Next.js proxy and protected pages check the user again on the server.

Adding a birthday to a person automatically creates a linked annual event. The Events page and dashboard show its next occurrence, including February 29 birthdays on February 28 in non-leap years. Change the person's name or birthday to update the event; clear the birthday to remove it. Gifts tied to a removed birthday event remain saved but lose that event assignment. The birthday event's budget and description remain editable.

Share URLs contain a cryptographically random 256-bit token. Only its SHA-256 hash is stored. Owners can share all gifts, a single event's gifts, or gifts assigned to one person. The public page uses a narrowly scoped RPC that returns gift name, description, estimated price, product URL, and status, plus event title/date when applicable. A person-specific list has a generic public title and does not reveal the person's name or profile. Event titles, including linked birthday event titles, are visible when that event is shared. Budgets and actual prices stay private. A link is displayed only when created; create a new one if you lose it. Owners can revoke links from **Shared lists**.

Spent totals count purchased and gifted items, using actual price when present and estimated price otherwise. Planned commitment counts all gifts except ideas with the same price fallback. Budgets show the amount remaining, including a negative balance when over budget.

## Gift images

Run `supabase/migrations/202610080003_gift_images.sql` in the Supabase SQL Editor before using images. It is safe whether or not the older `supabase/optional/gift_image_url.sql` was applied; do **not** run that older optional file afterward. The migration creates the private `gift-images` bucket with a 5 MB limit and JPG, PNG, and WebP restrictions. Users upload directly to their own folder through authenticated Supabase Storage requests. The server checks image contents before attaching an upload to a gift. Existing gifts remain unchanged and use the built-in illustrations.

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and Vercel's server environment variables. The key is never sent to the browser. Public shared lists validate their share token first, then issue five-minute signed URLs for private uploaded images. Revoking a link stops new signed URLs; URLs issued before revocation can remain usable until they expire. Shared-list pages send `Cache-Control: private, no-store`. External image URLs must use HTTPS and fall back to an illustration if loading fails.

## GitHub collaboration

Commit source files, `package-lock.json`, and the SQL migration. `.env.local`, `.next`, and `node_modules` are ignored. Invite collaborators to the GitHub repository; each collaborator creates their own `.env.local` using shared project settings through a secure channel. Work in feature branches, open pull requests, and run lint, typecheck, and build before merging. Coordinate schema changes as new numbered migrations rather than editing a migration already applied to a shared database.

## Vercel deployment

Import the GitHub repository into Vercel as a Next.js project. Add the same environment variables there, setting `NEXT_PUBLIC_SITE_URL` to the final `https://...` origin and keeping `SUPABASE_SERVICE_ROLE_KEY` server-only. Apply all three SQL migrations to a new production Supabase project, or only the third to a project that already has the first two. Add `https://your-domain/auth/callback` to Supabase's allowed redirect URLs; set the production Site URL as appropriate. The standard build command is `npm run build`. Redeploy after changing environment variables.

Before inviting users, verify signup confirmation, login/logout, password reset, CRUD, RLS with two test users, public list access, and revocation against your configured Supabase project.
