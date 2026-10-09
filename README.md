# Giftly

Giftly is a web application for planning thoughtful gifts in one place. It helps you remember the people you care about, keep gift ideas organized, prepare for upcoming occasions, and stay within a budget. Your planning data belongs to your account. When you want to show someone a list, you can create a read-only link for a person, an event, or your whole gift collection.

## Functionality

- **Accounts:** Email/password registration, email confirmation, login, logout, password reset, persistent sessions, and an editable display name.
- **People and occasions:** Create, edit, and delete people and events. Adding a person's birthday creates an annual event automatically; changing or clearing the birthday updates or removes that event.
- **Gifts:** Create, edit, and delete gift ideas; assign them to a person and/or event; record description, estimated and actual prices, product URL, and idea/planned/purchased/gifted status.
- **Images:** Optionally upload a JPG, PNG, or WebP image (up to 5 MB) or paste a direct HTTPS image URL. Gifts without images use built-in visual placeholders.
- **Budgets and overview:** Set person and event budgets, see spending and remaining amounts, and view dashboard statistics, recent gifts, and upcoming occasions. Amounts are shown in EUR.
- **Finding gifts:** Search by gift name, filter by status, person, or event, and sort by date, name, or estimated price.
- **Sharing:** Generate a public read-only link for all gifts, one event's gifts, or one person's gifts. Owners can revoke links. Public lists show only approved gift details, not private budgets or actual prices.

## Tech stack

| Area | Technology |
| --- | --- |
| Web application | Next.js 16 App Router, React 19, TypeScript |
| Styling and interface | Tailwind CSS 4, local shadcn-style components, Lucide React icons, Instrument Serif, Manrope |
| Authentication | Supabase Auth with `@supabase/ssr` |
| Database and files | Supabase PostgreSQL with Row Level Security, private Supabase Storage |
| Input validation | Zod |
| Package manager and hosting | npm, Vercel |

## 1. Get the project

You need Node.js **22 or newer**, npm, Git, and a Supabase account. A GitHub account and Vercel account are needed only if you want to collaborate or deploy. Clone your copy of the repository (or download its source archive), then install the locked dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_GIFTLY_REPOSITORY.git
cd YOUR_GIFTLY_REPOSITORY
npm ci
```

The repository URL and folder name above are placeholders for your own copy. Continue with the Supabase setup, create `.env.local`, then start the app.


## 2. Local development

Copy `.env.example` to `.env.local` (`cp .env.example .env.local` on macOS/Linux or `Copy-Item .env.example .env.local` in PowerShell). Replace the example values with your Supabase project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=sb_secret_YOUR_SERVER_KEY
```

Despite the existing variable name, `SUPABASE_SERVICE_ROLE_KEY` can hold Supabase's newer secret key or a legacy service role key. It is needed to display private uploaded images on public shared lists and is never sent to the browser. `.env.local` is ignored by Git.

```bash
npm run dev
```

Open `http://localhost:3000`, register an account, and follow the confirmation link sent by Supabase. Log in, add a person or occasion, then save a gift. The app uses your Supabase project as its database; there is no separate local database to start.

Before merging or deploying changes, run:

```bash
npm run lint
npm run typecheck
npm run build
node --experimental-strip-types tests/budget.test.mjs
node --experimental-strip-types tests/gift-images.test.mjs
```