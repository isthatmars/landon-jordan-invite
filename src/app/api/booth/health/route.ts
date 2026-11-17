import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { boothAiStatus } from "@/lib/booth/ai";
import { geminiRuntimeConfig } from "@/lib/booth/gemini";
import { openaiRuntimeConfig } from "@/lib/booth/openai";
import {
  boothDbEnabled,
  boothRequiresRemoteDb,
  rest,
  supabaseConfig,
  supabaseProjectRef,
} from "@/lib/booth/supabase";
import {
  PHOTO_BOOTH_OPENART_MODE,
  PHOTO_BOOTH_OPENART_MODEL,
} from "@/lib/photoBooth";

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

  const ai = boothAiStatus();
  const geminiCfg = geminiRuntimeConfig();
  const openaiCfg = openaiRuntimeConfig();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFromConfigured = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const requiresRemote = boothRequiresRemoteDb();
  const persistBackend = boothDbEnabled() ? "supabase" : "local";
  const ready = boothDbEnabled()
    ? boothPhotosReachable && ai.configured
    : !requiresRemote && ai.configured;

  if (!canSeeDiagnostics(request)) {
    return NextResponse.json({
      ok: ready,
      ready,
      ai: ai.configured,
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
  if (!ai.configured) {
    missing.push(
      "OPENAI_API_KEY (preferred) or OPENART_TOKEN or GEMINI_API_KEY",
    );
  }
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
    openai: {
      configured: ai.openai,
      model: openaiCfg.model,
      size: openaiCfg.size,
      quality: openaiCfg.quality,
    },
    openArt: {
      configured: ai.openart,
      model: PHOTO_BOOTH_OPENART_MODEL,
      mode: PHOTO_BOOTH_OPENART_MODE,
      mockAi: ai.mock,
    },
    gemini: {
      configured: ai.gemini,
      model: geminiCfg.model,
      aspectRatio: geminiCfg.aspectRatio,
      imageSize: geminiCfg.imageSize,
      concurrency: geminiCfg.concurrency,
    },
    ai: {
      configured: ai.configured,
      preferred: ai.provider,
      cascade: ai.cascade,
      preferenceOrder: ["openai", "openart", "gemini", "mock"],
    },
    resend: {
      configured: resendConfigured,
      fromConfigured: resendFromConfigured,
    },
    missing,
  });
}
