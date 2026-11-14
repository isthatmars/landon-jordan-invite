# 80s Photo Booth — architecture locks

## 1. Fixed environment (one persistent scene)

The booth stage never swaps backgrounds between steps. One scene (wood / curtains / props / neon panel); only inner panel content + Polaroid animation change. Design refs in `public/images/booth/ref-*.jpg` are mood boards, not per-step backgrounds.

## 2. OpenArt for AI generation

Identity-preserving 80s transforms use **OpenArt** (`OPENART_TOKEN`).

- Runtime: `src/lib/booth/ai.ts` → `src/lib/openart.ts` → image2image
- Routes: `POST /api/booth/generate` (full session + storage) and `POST /api/photo-booth/generate` (lightweight)
- Model: `nano-banana-2` (override `OPENART_IMAGE_MODEL`)
- Local only: `BOOTH_MOCK_AI=1` sharp grade (never report as real AI success in prod without the flag)

## 3. Guest identity

- Email OTP / magic link → httpOnly `lj_booth_session` cookie
- Match existing RSVPs by normalized email; Photo Booth never auto-marks attending
- localStorage email alone is never identity

## 4. Storage

- Supabase tables + private buckets when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set
- Local `.data/booth*` fallback otherwise
- AI source uploads deleted ≤30 min; outputs / throwbacks retained

## Flow

entry → auth → upload → confirm → generate (Polaroid) → ready → submitted / my photos
Throwbacks skip AI and go pending approval.
