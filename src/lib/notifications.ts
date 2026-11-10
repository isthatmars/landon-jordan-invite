/**
 * Notification stubs — email-first.
 *
 * Guest + owner confirmations: Resend (primary).
 * Owner-only SMS alerts: optional Twilio trial (no A2P required for trial→verified numbers).
 * Guest mass SMS: pluggable provider; default OFF. Prefer WhatsApp, phone export,
 * or light tools (LoopMessage / TextMagic-style) over Twilio A2P 10DLC for a personal party.
 */

export type SmsProviderId =
  | "none"
  | "twilio_owner_only"
  | "whatsapp_stub"
  | "export_csv"
  | "loopmessage_stub"
  | "textmagic_stub";

export interface NotifyResult {
  ok: boolean;
  channel: "email" | "sms";
  provider: string;
  stubbed: boolean;
  detail: string;
}

export function getSmsProvider(): SmsProviderId {
  const raw = (process.env.SMS_PROVIDER || "none").toLowerCase();
  const allowed: SmsProviderId[] = [
    "none",
    "twilio_owner_only",
    "whatsapp_stub",
    "export_csv",
    "loopmessage_stub",
    "textmagic_stub",
  ];
  return (allowed.includes(raw as SmsProviderId) ? raw : "none") as SmsProviderId;
}

/** Guest confirmation email via Resend (stub when key missing). */
export async function sendGuestEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "party@example.com";
  if (!key) {
    console.info("[notifications:email:stub]", { to: opts.to, subject: opts.subject, from });
    return {
      ok: true,
      channel: "email",
      provider: "resend",
      stubbed: true,
      detail: "RESEND_API_KEY unset — logged only. Wire Resend later.",
    };
  }
  // Real Resend call left as TODO — do not block demo on live keys.
  console.info("[notifications:email:todo-live]", { to: opts.to, subject: opts.subject, from });
  return {
    ok: true,
    channel: "email",
    provider: "resend",
    stubbed: true,
    detail: "RESEND_API_KEY present but live send deferred — stubbed for safety in this build.",
  };
}

/** Owner alert email (always preferred over SMS). */
export async function sendOwnerEmail(opts: {
  subject: string;
  html: string;
}): Promise<NotifyResult> {
  const owner = process.env.OWNER_EMAIL || "owner@example.com";
  return sendGuestEmail({ to: owner, subject: opts.subject, html: opts.html });
}

/**
 * Optional owner-only SMS (Twilio trial → verified numbers is enough).
 * Never used for mass guest blasts in the default config.
 */
export async function sendOwnerSms(body: string): Promise<NotifyResult> {
  const provider = getSmsProvider();
  if (provider === "none" || provider === "export_csv") {
    return {
      ok: true,
      channel: "sms",
      provider,
      stubbed: true,
      detail: "SMS provider is none/export — owner SMS skipped (email-first).",
    };
  }
  if (provider !== "twilio_owner_only") {
    console.info(`[notifications:sms:${provider}:owner-stub]`, body.slice(0, 120));
    return {
      ok: true,
      channel: "sms",
      provider,
      stubbed: true,
      detail: `${provider} owner ping stubbed. Swap implementation later.`,
    };
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.OWNER_PHONE;
  if (!sid || !token || !from || !to) {
    console.info("[notifications:sms:twilio-owner:stub]", body.slice(0, 120));
    return {
      ok: true,
      channel: "sms",
      provider: "twilio_owner_only",
      stubbed: true,
      detail: "Twilio/owner env incomplete — owner SMS stubbed. Trial + verified numbers is enough; skip A2P.",
    };
  }
  console.info("[notifications:sms:twilio-owner:todo-live]", { to, body: body.slice(0, 80) });
  return {
    ok: true,
    channel: "sms",
    provider: "twilio_owner_only",
    stubbed: true,
    detail: "Twilio credentials present; live owner SMS deferred — stubbed for safety.",
  };
}

/**
 * Guest SMS / mass text — pluggable, default off.
 * Prefer: WhatsApp, export for phone Messages, LoopMessage/TextMagic-style tools.
 * Do NOT require Twilio A2P 10DLC for a personal party.
 */
export async function sendGuestSmsBlast(opts: {
  bodies: { to: string; body: string }[];
  provider?: SmsProviderId;
}): Promise<NotifyResult> {
  const provider = opts.provider || getSmsProvider();
  if (provider === "none") {
    return {
      ok: true,
      channel: "sms",
      provider: "none",
      stubbed: true,
      detail:
        "Guest SMS disabled (email-first). Enable WhatsApp, export_csv, or a light provider — avoid A2P 10DLC.",
    };
  }
  if (provider === "export_csv") {
    console.info("[notifications:sms:export]", {
      count: opts.bodies.length,
      sample: opts.bodies.slice(0, 2),
    });
    return {
      ok: true,
      channel: "sms",
      provider: "export_csv",
      stubbed: true,
      detail: `Prepared ${opts.bodies.length} rows for phone Messages / personal send export (stub log).`,
    };
  }
  if (provider === "twilio_owner_only") {
    return {
      ok: false,
      channel: "sms",
      provider,
      stubbed: true,
      detail:
        "twilio_owner_only cannot mass-text guests (A2P avoided on purpose). Use email, WhatsApp, or export_csv.",
    };
  }
  console.info(`[notifications:sms:${provider}:guest-stub]`, {
    count: opts.bodies.length,
  });
  return {
    ok: true,
    channel: "sms",
    provider,
    stubbed: true,
    detail: `${provider} guest blast stubbed (${opts.bodies.length}). Wire real provider later — no A2P required for party use.`,
  };
}

export function neonEmailTemplate(opts: {
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="text-align:center;margin:28px 0">
          <a href="${opts.ctaUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#39FF14;color:#0a0a0a;font-weight:800;text-decoration:none;box-shadow:0 0 18px #39FF14">${opts.ctaLabel}</a>
        </p>`
      : "";
  return `<!DOCTYPE html><html><body style="margin:0;background:#0a0014;color:#fff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="border:2px solid #ff2bd6;border-radius:16px;padding:28px;box-shadow:0 0 24px #ff2bd680;background:linear-gradient(180deg,#1a0530,#0a0014)">
      <p style="text-align:center;color:#FFD700;font-size:22px;margin:0 0 8px">♛</p>
      <h1 style="text-align:center;color:#ff2bd6;font-size:28px;margin:0 0 16px;text-shadow:0 0 12px #ff2bd6">${opts.headline}</h1>
      <div style="color:#f3e8ff;line-height:1.55;font-size:15px">${opts.bodyHtml}</div>
      ${cta}
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px">Landon &amp; Jordan's 80s Birthday Party</p>
    </div>
  </div>
</body></html>`;
}
