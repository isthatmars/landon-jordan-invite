# Landon & Jordan's 80s Birthday Invite

Interactive neon synthwave invitation site (Next.js App Router + Tailwind + Framer Motion).

## Run locally

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
npm start
```

Copy `.env.example` → `.env.local` and fill what you need.

## Admin

- Visit `/admin`
- Default access code: `NEON80S` (override with `ADMIN_ACCESS_CODE`)

## Resend (email)

Notifications are **email-first**. Live sends kick in when these are set:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key (required for live email) |
| `RESEND_FROM_EMAIL` | From address (verified in Resend) |
| `OWNER_EMAIL` | Owner alert inboxes. A comma-separated list; each address gets the RSVP alert. |
| `NEXT_PUBLIC_SITE_URL` | Absolute site URL used in email CTAs |

Without `RESEND_API_KEY`, emails are logged locally only (fine for demos).

## SMS (optional / deferred)

Guest SMS is stubbed. Keep the admin composers; later wire:

- `WEBHOOK_FORWARD_URL` → Zapier/Make → SimpleTexting (or similar)
- Optional: `WEBHOOK_FORWARD_SECRET`, `WEBHOOK_FORWARD_ON_DRAFT=true`

## Highlights

- Full-viewport hero with HTML typography over a hard-cutout couple photo
- Physical cassette mixtape pile + player, CRT video browser, Pac-Man + pinball
- RSVP form with abandoned-draft hooks (file mock store, Supabase-ready)
- Neon `/admin` — CMS, RSVPs, media, email/SMS composers, reminders

Project store docs (when available): `edit-guide.md`, `admin-guide.md`, `notifications-plan.md`.
