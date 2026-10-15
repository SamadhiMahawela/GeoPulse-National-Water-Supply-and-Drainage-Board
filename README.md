# VES Field Tool (Vercel + Supabase)

Field app for Vertical Electrical Sounding: record AB/2 and apparent resistivity,
see the log-log curve, produce a report, and keep every survey in one shared database.

- `public/`   the app (installable on phones, works offline)
- `api/`      small server functions that talk to the database (run on Vercel)
- `lib/`      shared helpers for those functions
- `supabase/schema.sql`   the one database table, `surveys`

**Start with `GUIDE.md`** — step-by-step setup for GitHub, Supabase and Vercel.
