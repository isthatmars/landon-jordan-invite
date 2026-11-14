# 80s Photo Booth — architecture locks

## 1. Fixed environment (one persistent scene)

The booth stage never swaps backgrounds between steps. One OpenArt environment plate (`/images/booth/environment.jpg`: shag carpet, disco ball, vanity lights, flight case with Polaroid packs, CRT stack, neon bars) stays locked; only inner panel content + Polaroid animation change.

## 2. Entry = large two-column reference panel

Entry matches the reference: a large pink neon panel (~80–90% × ~70–75% of the stage) with a **left branded 80s Polaroid** (~45%) and **right controls** (~55%: welcome script, huge drag-drop, chunky upload). The Polaroid may flash once on click — no strobe, no modern “before” photo. Generate / ready still use the Polaroid camera eject animation in the same fixed room.

## 3. OpenArt for AI generation + booth art

Identity-preserving 80s transforms use **OpenArt** (`OPENART_TOKEN`).

- Runtime: `src/lib/booth/ai.ts` → `src/lib/openart.ts` → image2image
- Routes: `POST /api/booth/generate` (full session + storage) and `POST /api/photo-booth/generate` (lightweight)
- Model: `nano-banana-2` (override `OPENART_IMAGE_MODEL`)
- Local only: `BOOTH_MOCK_AI=1` sharp grade (never report as real AI success in prod without the flag)
- Booth art (environment, camera, samples, chrome title) also generated via OpenArt and checked into `public/images/booth/`

## 4. Guest identity

- Email OTP / magic link → httpOnly `lj_booth_session` cookie
- Match existing RSVPs by normalized email; Photo Booth never auto-marks attending
- localStorage email alone is never identity

## 5. Storage

- Supabase tables + private buckets when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
- Local `.data/booth*` fallback otherwise
- AI source uploads deleted ≤30 min; outputs / throwbacks retained
- Branded Polaroid export: `src/lib/booth/polaroid.ts` + `watermark.ts` pixel-composite crown → purple script → `chrome-80s.png` → BIRTHDAY PARTY with torn-paper seam (also `public/images/booth/polaroid-watermark.png` for on-screen frames)

## Flow

entry (two-column panel + sample Polaroid) → auth → upload → confirm → generate (printing camera) → ready → submitted / my photos
Throwbacks skip AI and go pending approval.
