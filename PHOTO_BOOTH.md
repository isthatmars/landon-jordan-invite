# 80s Photo Booth — architecture locks

## 1. Fixed environment (one persistent scene)

The booth stage never swaps backgrounds between steps. One OpenArt environment plate (`/images/booth/environment.jpg`: shag carpet, disco ball, vanity lights, flight case with Polaroid packs, CRT stack, neon bars) stays locked; only inner panel content + Polaroid animation change.

## 2. Entry = large two-column reference panel

Entry matches the reference: a large pink neon panel (~80–90% × ~70–75% of the stage) with a **left Polaroid + camera prop** (~45%) and **right controls** (~55%: welcome script, huge drag-drop, chunky upload). On-screen Polaroid frames are blank (no logo). The Polaroid may flash once on click — no strobe, no modern “before” photo. Generate / ready still use the Polaroid camera eject animation in the same fixed room.

## 3. OpenArt for AI generation + booth art

Identity-preserving 80s transforms use **OpenArt** (`OPENART_TOKEN`).

- Runtime: `src/lib/booth/ai.ts` → `src/lib/openart.ts` → image2image
- Routes: `POST /api/booth/generate` (full session + storage) and `POST /api/photo-booth/generate` (lightweight)
- Model: `nano-banana-2` (override `OPENART_IMAGE_MODEL`)
- Local only: `BOOTH_MOCK_AI=1` sharp grade (never report as real AI success in prod without the flag)
- Booth art (environment, camera, samples, chrome title) also generated via OpenArt and checked into `public/images/booth/`

### Required: `OPENART_TOKEN` on Vercel

OpenArt has no classic API-key product — `OPENART_TOKEN` is the **OAuth access token** from the
OpenArt CLI (`openart login` → `~/.openart/cli-credentials.json` → `access_token`). Locally the
server also reads that file when the env var is unset.

Preview/production Photo Booth AI will not run until this **server-only** secret is set on the
Vercel project `landon-jordan-invite` (`prj_lve7NCw0qR8fpOquEv5RUrTON6IY`) for **Preview + Production**:

1. On a trusted machine: `openart login`, then copy `access_token` from
   `~/.openart/cli-credentials.json` (do not commit it).
2. Vercel → Project → Settings → Environment Variables → add `OPENART_TOKEN` (Encrypted) for
   Preview + Production (+ Development if you `vercel env pull`).
3. Redeploy Preview/Production so the new env is picked up.
4. Confirm with `GET /api/booth/session` → `ai.configured: true` and `ai.openart: true`.

Guests never see the env-var name; the confirm step shows a friendly unavailable message and disables
**Create** when no provider is configured. Dev builds may show a short setup hint.

## 4. Guest identity (verify only at save)

- Guests can **enter, upload, generate AI photos, preview Polaroids, and download the current raw draft without email**.
- Email OTP / magic link → httpOnly `lj_booth_session` cookie is required only to:
  - **Add to Party Gallery** / permanent library association
  - **See my photos**
- Anonymous drafts use httpOnly `lj_booth_anon` and a synthetic `anon.*.@booth.local` owner until claimed on verify + submit
- Match existing RSVPs by normalized email; Photo Booth never auto-marks attending
- localStorage email alone is never identity
- Post-booth RSVP handoff still works once they have a verified email

### Dev / preview OTP (testing)

`POST /api/booth/auth/start` always returns JSON. When Resend is missing/fails **or** when any of these are true, the response includes `devCode` so QA can finish verify without inbox access:

- `NODE_ENV !== "production"`
- `VERCEL_ENV=preview`
- `BOOTH_DEV_OTP=1`
- `BOOTH_EXPOSE_OTP=1`

OTP rows prefer Supabase `booth_otp_challenges`; on remote failure the server falls back to local/memory store so SEND CODE does not 503 during testing.

## 5. Storage

- Supabase tables + private buckets when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
- **Same Supabase project as RSVPs** — `https://ezuqjqdeqmdwumcqvksi.supabase.co` (`landon-jordan-invite`)
- Tables: `booth_photos`, `booth_sessions`, `booth_otp_challenges`, `booth_generations`, `booth_temp_uploads`, `booth_rate_events` (RLS on; service role bypasses)
- Private buckets: `booth-temp`, `booth-outputs`, `booth-throwbacks`
- Local `.data/booth*` fallback **only on local/dev** (never on Vercel preview/prod gallery save)
- AI source uploads deleted ≤30 min; outputs / throwbacks retained
- Downloads + gallery/admin storage serve the **raw** AI/throwback image (no Polaroid frame, no logo). On-screen CSS Polaroid is display-only. `composeBrandedPolaroid` remains available but is not used for guest downloads.
- Wiring check: `GET /api/booth/health` (no secrets; reports project ref + missing env)

## Env / secrets checklist (Preview + Production)

Set these in the Vercel project `landon-jordan-invite` for **Preview** and **Production** (server-only — never `NEXT_PUBLIC_` for secrets):

| Variable | Required for | Notes |
|---|---|---|
| `SUPABASE_URL` | Gallery save + RSVP | Must be `https://ezuqjqdeqmdwumcqvksi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Gallery save + RSVP | Service role; bypasses RLS. Same key RSVP already uses. |
| `OPENART_TOKEN` | Real AI transforms | Sibling agent wires this. Without it, set `BOOTH_MOCK_AI=1` for QA only. |
| `RESEND_API_KEY` | OTP email + RSVP mail | Without it, preview can still expose `devCode`. |
| `RESEND_FROM_EMAIL` | Live email From | Verified sender in Resend. |
| `NEXT_PUBLIC_SITE_URL` | Email / magic-link CTAs | Absolute site URL. |
| `OWNER_EMAIL` | Owner RSVP alerts | Comma-separated OK. |
| `ADMIN_ACCESS_CODE` | `/admin` | Default `NEON80S` if unset. |

Optional / local-only: `BOOTH_MOCK_AI`, `BOOTH_DEV_OTP`, `BOOTH_EXPOSE_OTP`, `BOOTH_CLEANUP_SECRET`, `OPENART_IMAGE_MODEL`, `OPENART_API_BASE`.

## Flow

entry (two-column panel + sample Polaroid) → upload → confirm → generate (printing camera) → ready (download OK) → **verify at save** → submitted / my photos

Throwbacks follow the same private-until-save rule (no auto-pending gallery submit without verified email).
