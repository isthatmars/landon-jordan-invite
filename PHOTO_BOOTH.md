# 80s Photo Booth — architecture locks

Non-negotiable rules for this feature. Do not regress them.

## 1. Fixed environment (one persistent scene)

The booth **stage never swaps backgrounds between steps**.

- Match only the *idea and steps* from design references (`public/images/booth/ref-*.jpg`).
- Do **not** swap full-bleed backgrounds / room art per step the way those reference comps do.
- One persistent Photo Booth scene for the whole flow: wood, curtains, props, neon panel chrome.
- Only **inner panel content** and the **Polaroid animation** change across steps.

Implementation:
- Live UI: `src/components/PhotoBooth.tsx` — persistent `.booth-scene` (wood/curtains/props); panel steps swap inside `.booth-panel` only.
- Shell reference: `src/components/photo-booth/BoothShell.tsx` (same rule).
- CSS: `src/app/photo-booth.css` — never key `.booth-scene` art off step id.
- Design comps in `public/images/booth/ref-*.jpg` are idea/step references only — not live backgrounds.

## 2. OpenArt for AI generation

Identity-preserving 80s transforms go through **OpenArt** only (primary provider).

- Runtime path: `src/lib/booth/ai.ts` → `src/lib/openart.ts` → OpenArt CLI API (`image2image`)
- Also: `POST /api/photo-booth/generate` (lightweight) and `POST /api/booth/generate` (session + storage)
- Default model: `nano-banana-2` (override with `OPENART_IMAGE_MODEL`)
- Auth: server-only `OPENART_TOKEN` (optional `OPENART_API_BASE`, default `https://openart.ai`)
- **Do not** use Vercel AI Gateway / Gemini / Replicate / fal / OpenAI Images as the primary booth generator

Agent/MCP path for asset work: OpenArt MCP (`openart_model_list` → form → upload + `openart_generate_image` + wait).

## Flow (panel content only)

Typical steps (names may vary in UI): welcome → capture/upload → generating → reveal/Polaroid → share.
All steps share the same booth shell.
