# 80s Photo Booth — architecture locks

## 1. Fixed environment (one persistent scene)

The booth stage never swaps backgrounds between steps. One OpenArt environment plate (`/images/booth/environment.jpg`: shag carpet, disco ball, vanity lights, flight case with Polaroid packs, CRT stack, neon bars) stays locked; only inner panel content + Polaroid animation change.

## 2. Entry = large two-column reference panel

Entry matches the reference: a large pink neon panel (~80–90% × ~70–75% of the stage) with a **left Polaroid + camera prop** (~45%) and **right controls** (~55%: welcome script, huge drag-drop, chunky upload). On-screen Polaroid frames are blank (no logo). The Polaroid may flash once on click — no strobe, no modern “before” photo. Generate / ready still use the Polaroid camera eject animation in the same fixed room.

## 3. AI generation (Gemini preferred) + booth art

Identity-preserving 80s transforms use **Gemini first** when a Gemini key is set, otherwise **OpenArt**.

- Runtime: `src/lib/booth/ai.ts` → `src/lib/booth/gemini.ts` (preferred) or `src/lib/openart.ts`
- Routes: `POST /api/booth/generate` (full session + storage) and `POST /api/photo-booth/generate` (lightweight)
- Gemini runtime: `@google/genai` via `src/lib/booth/gemini.ts`
- Gemini model: `gemini-2.5-flash-image` (override `GEMINI_IMAGE_MODEL`) — typically a few seconds
- Gemini image defaults: `GEMINI_IMAGE_ASPECT_RATIO=16:9`, `GEMINI_IMAGE_SIZE=2K`, `IMAGE_GENERATION_CONCURRENCY=3`
- OpenArt model: `nano-banana-2` (override `OPENART_IMAGE_MODEL`)
- Preference: if `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` is set, Gemini runs first; OpenArt is used when Gemini is unset, or as fallback if Gemini fails and `OPENART_TOKEN` is present
- Local only: `BOOTH_MOCK_AI=1` sharp grade (never report as real AI success in prod without the flag)
- Booth art (environment, camera, samples, chrome title) was generated via OpenArt and checked into `public/images/booth/`

### Preferred: `GEMINI_API_KEY` on Vercel

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Vercel → project `landon-jordan-invite` → Settings → Environment Variables → add for **Production** (and Preview if desired):
   - `GEMINI_API_KEY` (Encrypted / Sensitive)
   - `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image`
   - `GEMINI_IMAGE_ASPECT_RATIO=16:9`
   - `GEMINI_IMAGE_SIZE=2K`
   - `IMAGE_GENERATION_CONCURRENCY=3`
3. Redeploy so the env is live.
4. Confirm: `GET /api/booth/health` → `gemini.configured: true` and `ai.preferred: "gemini"`.

### Optional fallback: `OPENART_TOKEN`

OpenArt has no classic API-key product — `OPENART_TOKEN` is the OAuth **`access_token`** from the
OpenArt CLI (`openart login` → `~/.openart/cli-credentials.json`). Locally the Next server also reads
that file when the env var is unset. Credentials may use `access_token`, `accessToken`, or `token`
(a `KeyError: access_token` usually means the file uses a different key name).

```sh
# Safe extract (handles access_token / accessToken / token):
python3 -c "import json,pathlib; c=json.load(open(pathlib.Path.home()/'.openart'/'cli-credentials.json')); print(c.get('access_token') or c.get('accessToken') or c.get('token') or '')"
```

Guests never see env-var names; the confirm step shows a friendly unavailable message and disables
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
| `GEMINI_API_KEY` | Real AI transforms (preferred) | From Google AI Studio. Alias: `GOOGLE_GENERATIVE_AI_API_KEY`. |
| `OPENART_TOKEN` | AI fallback | OAuth `access_token` from `openart login` (optional if Gemini is set). |
| `RESEND_API_KEY` | OTP email + RSVP mail | Without it, preview can still expose `devCode`. |
| `RESEND_FROM_EMAIL` | Live email From | Verified sender in Resend. |
| `NEXT_PUBLIC_SITE_URL` | Email / magic-link CTAs | Absolute site URL. |
| `OWNER_EMAIL` | Owner RSVP alerts | Comma-separated OK. |
| `ADMIN_ACCESS_CODE` | `/admin` | Default `NEON80S` if unset. |

Optional: `GEMINI_IMAGE_MODEL`, `GEMINI_IMAGE_ASPECT_RATIO`, `GEMINI_IMAGE_SIZE`, `IMAGE_GENERATION_CONCURRENCY`, `OPENART_IMAGE_MODEL`, `OPENART_API_BASE`.

Local-only: `BOOTH_MOCK_AI`, `BOOTH_DEV_OTP`, `BOOTH_EXPOSE_OTP`, `BOOTH_CLEANUP_SECRET`.

## Flow

entry (two-column panel + sample Polaroid) → upload → confirm → generate (printing camera) → ready (download OK) → **verify at save** → submitted / my photos

Throwbacks follow the same private-until-save rule (no auto-pending gallery submit without verified email).
