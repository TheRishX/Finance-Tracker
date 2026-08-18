# Paisa

A minimal, installable expense tracker for students. Paisa supports custom money months (for example, the 20th through the 19th), quick expense entry, spending breakdowns, private savings pockets, emergency-fund nudges, and a reflective wishlist.

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Add your project URL and publishable key to `.env`. Paisa uses passwordless email authentication and stores each signed-in user's data in Supabase.

## Supabase

Apply the files in `supabase/migrations` in order. They create the profile, expenses, funds, and wishlist tables with per-user row-level security and supporting indexes. Never put a secret/service-role key in `VITE_*` variables.

In **Authentication → URL Configuration** in the Supabase dashboard, set the Site URL to the deployed app URL and add local development URLs such as `http://localhost:5173` to the redirect allow list. Magic-link sign-in requires an allowed redirect URL.

## Install

The production build is a PWA and can be installed from a supported browser. For native apps, install a Capacitor platform and sync:

```bash
pnpm build
pnpm exec cap add android # or ios
pnpm cap:sync
```
