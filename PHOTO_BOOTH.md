# 80s Photo Booth — architecture locks

## 1. Fixed environment (one persistent scene)

The booth stage never swaps backgrounds between steps. One OpenArt environment plate (`/images/booth/environment.jpg`: shag carpet, disco ball, vanity lights, flight case with Polaroid packs, CRT stack, neon bars) stays locked; only inner panel content + Polaroid animation change.

## 2. Entry = large two-column reference panel

Entry matches the reference: a large pink neon panel (~80–90% × ~70–75% of the stage) with a **left Polaroid + camera prop** (~45%) and **right controls** (~55%: welcome script, huge drag-drop, chunky upload). On-screen Polaroid frames are blank (no logo). The Polaroid may flash once on click — no strobe, no modern “before” photo. Generate / ready still use the Polaroid camera eject animation in the same fixed room.

## 3. AI generation (OpenAI Images preferred) + booth art

Identity-preserving 80s transforms cascade through configured providers:

1. **OpenAI Images Edit** when `OPENAI_API_KEY` is set (preferred)
2. **OpenArt** when `OPENART_TOKEN` is set
3. **Gemini** when `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` is set
4. **Mock** sharp grade only when `BOOTH_MOCK_AI=1`

If a preferred provider fails, the next configured provider is tried automatically.

- Runtime: `src/lib/booth/ai.ts` → `openai.ts` / `openart.ts` / `gemini.ts`
- Routes: `POST /api/booth/generate` (full session + storage) and `POST /api/photo-booth/generate` (lightweight)
- OpenAI: `POST /v1/images/edits` via `src/lib/booth/openai.ts` (multipart image + prompt — **not** chat completions)
- OpenAI model: **`gpt-image-2.5-flare`** (fast Flare tier). Override with `OPENAI_IMAGE_MODEL`.
- If `OPENAI_MODEL` is a chat model (e.g. `gpt-5.2`), it is **ignored** for Images — use `OPENAI_IMAGE_MODEL`.
- OpenAI size: portrait-first **`1024x1536`** (2:3). Landscape sources stay `1536x1024` — never force landscape onto a portrait upload. Quality default `medium`.
- OpenAI prompt: `What would this picture look like if it were taken in the 80's? retain facial features.`
- OpenArt model: `nano-banana-2` (override `OPENART_IMAGE_MODEL`)
- Gemini runtime: `@google/genai` via `src/lib/booth/gemini.ts`
- Gemini model: `gemini-nano-banana-2.1` (override `GEMINI_IMAGE_MODEL`)
- Gemini image defaults: `GEMINI_IMAGE_ASPECT_RATIO=auto`, `GEMINI_IMAGE_SIZE=2K`, `IMAGE_GENERATION_CONCURRENCY=3`, temperature `0.4`
- Local only: `BOOTH_MOCK_AI=1` sharp grade (never report as real AI success in prod without the flag)
- Local-only port sketch: `PORT=4174` → `npm run dev -- -p 4174` (not used on Vercel)
- Booth art (environment, camera, samples, chrome title) was generated via OpenArt and checked into `public/images/booth/`

### Transform prompt defaults

**OpenAI** uses the short Images prompt (`PHOTO_BOOTH_OPENAI_PROMPT` in `src/lib/booth/openai.ts`).

**OpenArt / Gemini** use the canonical **master prompt**: `EIGHTYS_STYLE_PROMPT` / `PHOTO_BOOTH_MASTER_PROMPT` + `buildEightysOpenArtPrompt()` in `src/lib/booth/types.ts` (fallback `PHOTO_BOOTH_TRANSFORM_PROMPT` in `src/lib/photoBooth.ts`).

Goal: **true-to-life late-1980s / early-1990s consumer film snapshot** via image-to-image reinterpretation of the upload — documentary / photoreal, not costume-party 80s AI art.

- **Lock:** same faces, skin tone, expression, body type, pose, people count, **same glasses when present**, scene vibe / framing
- **Film look:** warm C-41 consumer film, visible grain, slight softness — not costume-party neon AI art
- **Variation:** `buildEightysOpenArtPrompt({ variationSeed })` rotates light outfit / environment / film-detail accents (OpenArt / Gemini)
- **Never:** logos, watermarks, drawn Polaroid borders, or text overlays in the image
- Downloads stay **raw** (no Polaroid frame); on-screen Polaroid is CSS-only
- Guest-facing errors stay soft; real provider errors are logged server-side (`[booth:ai:…]`) and a short detail is stored on failed `booth_generations` rows

### Preferred: `OPENAI_API_KEY` on Vercel

1. Create an API key in [OpenAI Platform](https://platform.openai.com/api-keys).
2. Vercel → project `landon-jordan-invite` → Settings → Environment Variables → add for **Production** (and Preview if desired):
   - `OPENAI_API_KEY` (Encrypted / Sensitive)
   - `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare`
   - Optional: `OPENAI_IMAGE_SIZE=1024x1536`, `OPENAI_IMAGE_QUALITY=medium`
3. Redeploy so the env is live.
4. Confirm: `GET /api/booth/health` → public `{ ready, ai }` booleans; diagnostics (admin / `x-booth-health-secret`) show `ai.preferred`, `ai.cascade`, and per-provider config.

### Fallback: `OPENART_TOKEN`

OpenArt has no classic API-key product — `OPENART_TOKEN` is the OAuth **`access_token`** from the
OpenArt CLI (`openart login` → `~/.openart/cli-credentials.json`). Locally the Next server also reads
that file when the env var is unset. Credentials may use `access_token`, `accessToken`, or `token`
(a `KeyError: access_token` usually means the file uses a different key name).

```sh
# Safe extract (handles access_token / accessToken / token):
python3 -c "import json,pathlib; c=json.load(open(pathlib.Path.home()/'.openart'/'cli-credentials.json')); print(c.get('access_token') or c.get('accessToken') or c.get('token') or '')"
```

### Optional: `GEMINI_API_KEY`

Create a key in [Google AI Studio](https://aistudio.google.com/apikey). Used when OpenAI/OpenArt are unset, or as a later cascade step after they fail.

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
- Wiring check: `GET /api/booth/health` (public booleans only; full diagnostics with admin / `BOOTH_HEALTH_SECRET`)

## Env / secrets checklist (Preview + Production)

Set these in the Vercel project `landon-jordan-invite` for **Preview** and **Production** (server-only — never `NEXT_PUBLIC_` for secrets):

| Variable | Required for | Notes |
|---|---|---|
| `SUPABASE_URL` | Gallery save + RSVP | Must be `https://ezuqjqdeqmdwumcqvksi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Gallery save + RSVP | Service role; bypasses RLS. Same key RSVP already uses. |
| `OPENAI_API_KEY` | Real AI transforms (preferred) | OpenAI Images `/v1/images/edits` (not chat). |
| `OPENAI_IMAGE_MODEL` | OpenAI model id | Default `gpt-image-2.5-flare`. Ignore chat `OPENAI_MODEL`. |
| `OPENART_TOKEN` | AI fallback | OAuth `access_token` from `openart login`. |
| `GEMINI_API_KEY` | AI fallback | From Google AI Studio. Alias: `GOOGLE_GENERATIVE_AI_API_KEY`. |
| `RESEND_API_KEY` | OTP email + RSVP mail | Without it, preview can still expose `devCode`. |
| `RESEND_FROM_EMAIL` | Live email From | Verified sender in Resend. |
| `NEXT_PUBLIC_SITE_URL` | Email / magic-link CTAs | Absolute site URL. |
| `OWNER_EMAIL` | Owner RSVP alerts | Comma-separated OK. |
| `ADMIN_ACCESS_CODE` | `/admin` | Default `NEON80S` if unset. |

Optional: `OPENAI_IMAGE_QUALITY` (`medium`), `OPENAI_IMAGE_SIZE` (`1024x1536` portrait), `OPENART_IMAGE_MODEL`, `OPENART_API_BASE`, `GEMINI_IMAGE_MODEL`, `GEMINI_IMAGE_ASPECT_RATIO`, `GEMINI_IMAGE_SIZE`, `IMAGE_GENERATION_CONCURRENCY`.

Local-only: `PORT=4174` (dev server), `BOOTH_MOCK_AI`, `BOOTH_DEV_OTP`, `BOOTH_EXPOSE_OTP`, `BOOTH_CLEANUP_SECRET`.

## Flow

entry (two-column panel + sample Polaroid) → upload → confirm → generate (printing camera) → ready (download OK) → **verify at save** → submitted / my photos

Throwbacks follow the same private-until-save rule (no auto-pending gallery submit without verified email).
