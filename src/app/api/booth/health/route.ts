import { NextResponse } from "next/server";
import { geminiConfigured } from "@/lib/booth/gemini";
import {
  boothDbEnabled,
  boothRequiresRemoteDb,
  rest,
  supabaseConfig,
  supabaseProjectRef,
} from "@/lib/booth/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, non-secret booth wiring status for preview/prod checklists.
 * Does not return key material — only booleans + project ref/host.
 */
export async function GET() {
  const cfg = supabaseConfig();
  const ref = supabaseProjectRef();
  let host: string | null = null;
  if (cfg) {
    try {
      host = new URL(cfg.url).hostname;
    } catch {
      host = null;
    }
  }

  let boothPhotosReachable = false;
  let boothPhotosError: string | null = null;
  if (boothDbEnabled()) {
    try {
      await rest<unknown[]>("booth_photos?select=id&limit=1");
      boothPhotosReachable = true;
    } catch (err) {
      boothPhotosError = err instanceof Error ? err.message.slice(0, 180) : "probe failed";
    }
  }

  const gemini = geminiConfigured();
  const openArtConfigured = Boolean(process.env.OPENART_TOKEN?.trim());
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFromConfigured = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const mockAi = process.env.BOOTH_MOCK_AI === "1";
  const requiresRemote = boothRequiresRemoteDb();
  const persistBackend = boothDbEnabled() ? "supabase" : "local";
  const aiConfigured = gemini || openArtConfigured || mockAi;

  const missing: string[] = [];
  if (requiresRemote && !boothDbEnabled()) {
    missing.push("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  } else if (!boothDbEnabled()) {
    missing.push("SUPABASE_URL (optional locally)", "SUPABASE_SERVICE_ROLE_KEY (optional locally)");
  }
  // Prefer Gemini; OpenArt is optional fallback. Only flag AI missing when neither (nor mock) is set.
  if (!aiConfigured) missing.push("GEMINI_API_KEY (or OPENART_TOKEN)");
  if (!resendConfigured) missing.push("RESEND_API_KEY");
  if (!resendFromConfigured) missing.push("RESEND_FROM_EMAIL");

  return NextResponse.json({
    ok: boothDbEnabled() ? boothPhotosReachable : !requiresRemote,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    persistBackend,
    requiresRemoteDb: requiresRemote,
    supabase: {
      configured: boothDbEnabled(),
      projectRef: ref,
      host,
      expectedRef: "ezuqjqdeqmdwumcqvksi",
      matchesExpected: ref === "ezuqjqdeqmdwumcqvksi",
      boothPhotosReachable,
      boothPhotosError,
      buckets: ["booth-temp", "booth-outputs", "booth-throwbacks"],
    },
    gemini: { configured: gemini },
    openArt: { configured: openArtConfigured, mockAi },
    ai: {
      configured: aiConfigured,
      preferred: gemini ? "gemini" : openArtConfigured ? "openart" : mockAi ? "mock" : "none",
    },
    resend: { configured: resendConfigured, fromConfigured: resendFromConfigured },
    missing,
  });
}
