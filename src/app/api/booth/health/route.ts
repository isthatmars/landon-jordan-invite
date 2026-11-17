import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { geminiRuntimeConfig } from "@/lib/booth/gemini";
import {
  boothDbEnabled,
  boothRequiresRemoteDb,
  rest,
  supabaseConfig,
  supabaseProjectRef,
} from "@/lib/booth/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canSeeDiagnostics(request: Request): boolean {
  if (requireAdminFromRequest(request)) return true;
  const secret =
    process.env.BOOTH_CLEANUP_SECRET?.trim() ||
    process.env.BOOTH_HEALTH_SECRET?.trim() ||
    "";
  if (!secret) return false;
  const header =
    request.headers.get("x-booth-cleanup-secret") ||
    request.headers.get("x-booth-health-secret") ||
    "";
  return header === secret;
}

/**
 * Public: booleans only (ready / ai).
 * Diagnostics (models, project ref, missing env names): admin cookie or
 * x-booth-health-secret / x-booth-cleanup-secret matching BOOTH_*_SECRET.
 */
export async function GET(request: Request) {
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
      boothPhotosError =
        err instanceof Error ? err.message.slice(0, 180) : "probe failed";
    }
  }

  const geminiCfg = geminiRuntimeConfig();
  const gemini = geminiCfg.configured;
  const openArtConfigured = Boolean(process.env.OPENART_TOKEN?.trim());
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFromConfigured = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const mockAi = process.env.BOOTH_MOCK_AI === "1";
  const requiresRemote = boothRequiresRemoteDb();
  const persistBackend = boothDbEnabled() ? "supabase" : "local";
  const aiConfigured = gemini || openArtConfigured || mockAi;
  const ready = boothDbEnabled()
    ? boothPhotosReachable && aiConfigured
    : !requiresRemote && aiConfigured;

  if (!canSeeDiagnostics(request)) {
    return NextResponse.json({
      ok: ready,
      ready,
      ai: aiConfigured,
    });
  }

  const missing: string[] = [];
  if (requiresRemote && !boothDbEnabled()) {
    missing.push("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  } else if (!boothDbEnabled()) {
    missing.push(
      "SUPABASE_URL (optional locally)",
      "SUPABASE_SERVICE_ROLE_KEY (optional locally)",
    );
  }
  if (!aiConfigured) missing.push("GEMINI_API_KEY (or OPENART_TOKEN)");
  if (!resendConfigured) missing.push("RESEND_API_KEY");
  if (!resendFromConfigured) missing.push("RESEND_FROM_EMAIL");

  return NextResponse.json({
    ok: boothDbEnabled() ? boothPhotosReachable : !requiresRemote,
    ready,
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
    gemini: {
      configured: gemini,
      model: geminiCfg.model,
      aspectRatio: geminiCfg.aspectRatio,
      imageSize: geminiCfg.imageSize,
      concurrency: geminiCfg.concurrency,
    },
    openArt: { configured: openArtConfigured, mockAi },
    ai: {
      configured: aiConfigured,
      preferred: gemini
        ? "gemini"
        : openArtConfigured
          ? "openart"
          : mockAi
            ? "mock"
            : "none",
    },
    resend: {
      configured: resendConfigured,
      fromConfigured: resendFromConfigured,
    },
    missing,
  });
}
