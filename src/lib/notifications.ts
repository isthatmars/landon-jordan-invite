/**
 * Notifications — email-first (ship Resend now; defer live SMS).
 *
 * Resend: guest confirmation + owner alert + admin composers/reminders.
 *   - No RESEND_API_KEY → stub/log (local demo OK)
 *   - Key present → live POST https://api.resend.com/emails
 *
 * SMS: composer + WEBHOOK_FORWARD → SimpleTexting stubs kept; live SMS deferred.
 */

export type SmsProviderId =
  | "none"
  | "twilio_owner_only"
  | "whatsapp_stub"
  | "export_csv"
  | "loopmessage_stub"
  | "textmagic_stub"
  | "simpletexting_webhook";

export interface NotifyResult {
  ok: boolean;
  channel: "email" | "sms";
  provider: string;
  stubbed: boolean;
  detail: string;
  id?: string;
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
    "simpletexting_webhook",
  ];
  return (allowed.includes(raw as SmsProviderId) ? raw : "none") as SmsProviderId;
}

/** Split OWNER_EMAIL on commas or semicolons. Blanks dropped, duplicates ignored. */
export function parseOwnerEmails(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[,;]/)) {
    const email = part.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return emails;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!key) {
    console.info("[notifications:email:stub]", {
      to: opts.to,
      subject: opts.subject,
      from,
    });
    return {
      ok: true,
      channel: "email",
      provider: "resend",
      stubbed: true,
      detail:
        "RESEND_API_KEY unset — logged only. Set RESEND_API_KEY + RESEND_FROM_EMAIL + OWNER_EMAIL to go live.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!res.ok) {
      console.warn("[notifications:email:resend-error]", res.status, data);
      return {
        ok: false,
        channel: "email",
        provider: "resend",
        stubbed: false,
        detail: `Resend ${res.status}: ${data.message || data.name || "send failed"}`,
      };
    }
    return {
      ok: true,
      channel: "email",
      provider: "resend",
      stubbed: false,
      id: data.id,
      detail: `Sent via Resend (${data.id || "ok"})`,
    };
  } catch (err) {
    console.warn("[notifications:email:resend-exception]", err);
    return {
      ok: false,
      channel: "email",
      provider: "resend",
      stubbed: false,
      detail: "Resend request failed (network). RSVP still saved.",
    };
  }
}

/** Guest confirmation / blast email — live when RESEND_API_KEY is set. */
export async function sendGuestEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<NotifyResult> {
  if (!opts.to.trim()) {
    return {
      ok: true,
      channel: "email",
      provider: "resend",
      stubbed: true,
      detail: "No guest email — confirmation not sent.",
    };
  }
  return sendViaResend(opts);
}

/**
 * Owner alert email. OWNER_EMAIL may list several inboxes, separated by
 * commas or semicolons. Each address gets its own send. Guest mail never
 * goes through here.
 */
export async function sendOwnerEmail(opts: {
  subject: string;
  html: string;
}): Promise<NotifyResult> {
  const owners = parseOwnerEmails(process.env.OWNER_EMAIL);
  if (owners.length === 0) {
    console.info("[notifications:email:owner:stub]", opts.subject);
    return {
      ok: true,
      channel: "email",
      provider: "resend",
      stubbed: true,
      detail:
        "OWNER_EMAIL unset — owner alert skipped (set OWNER_EMAIL to receive RSVP pings).",
    };
  }

  const results = await Promise.all(
    owners.map((to) => sendViaResend({ to, subject: opts.subject, html: opts.html })),
  );
  const failed = results.filter((result) => !result.ok);
  const stubbed = results.every((result) => result.stubbed);
  const inboxLabel = owners.length === 1 ? "inbox" : "inboxes";
  let detail = `Owner alert sent to ${owners.length} ${inboxLabel}.`;
  if (stubbed) {
    detail = `Owner alert logged for ${owners.length} ${inboxLabel}. RESEND_API_KEY unset.`;
  } else if (failed.length > 0) {
    detail = `Owner alert failed for ${failed.length} of ${owners.length} ${inboxLabel}.`;
  }

  return {
    ok: failed.length === 0,
    channel: "email",
    provider: "resend",
    stubbed,
    id: results.map((result) => result.id).filter(Boolean).join(",") || undefined,
    detail,
  };
}

/**
 * Owner-only SMS — deferred. Kept for future; default SMS_PROVIDER=none.
 */
export async function sendOwnerSms(body: string): Promise<NotifyResult> {
  const provider = getSmsProvider();
  if (provider === "none" || provider === "export_csv" || provider === "simpletexting_webhook") {
    return {
      ok: true,
      channel: "sms",
      provider,
      stubbed: true,
      detail: "Live SMS deferred — email (Resend) is the ship path. SMS composer/webhook stubs remain.",
    };
  }
  console.info(`[notifications:sms:${provider}:owner-stub]`, body.slice(0, 120));
  return {
    ok: true,
    channel: "sms",
    provider,
    stubbed: true,
    detail: `${provider} owner SMS stubbed (live SMS deferred).`,
  };
}

/**
 * Guest SMS / mass text — deferred. Prefer SimpleTexting via WEBHOOK_FORWARD later.
 */
export async function sendGuestSmsBlast(opts: {
  bodies: { to: string; body: string }[];
  provider?: SmsProviderId;
}): Promise<NotifyResult> {
  const provider = opts.provider || getSmsProvider();
  console.info(`[notifications:sms:${provider}:guest-deferred]`, {
    count: opts.bodies.length,
  });
  return {
    ok: true,
    channel: "sms",
    provider,
    stubbed: true,
    detail:
      "Live guest SMS deferred. Keep composer UI; later WEBHOOK_FORWARD_URL → Zapier/Make → SimpleTexting.",
  };
}

/**
 * Optional SMS/automation forward (deferred live use).
 * Recommended later: Zapier/Make → SimpleTexting. Our /admin stays the only guest list.
 */
export async function forwardRsvpWebhook(opts: {
  event: "rsvp.completed" | "rsvp.draft";
  rsvp: Record<string, unknown>;
  site?: { eventDate?: string; eventVenue?: string; eventTime?: string };
}): Promise<NotifyResult> {
  const url = process.env.WEBHOOK_FORWARD_URL;
  if (!url) {
    return {
      ok: true,
      channel: "sms",
      provider: "webhook_forward",
      stubbed: true,
      detail: "WEBHOOK_FORWARD_URL unset — SimpleTexting forward skipped (SMS deferred).",
    };
  }
  if (opts.event === "rsvp.draft" && process.env.WEBHOOK_FORWARD_ON_DRAFT !== "true") {
    return {
      ok: true,
      channel: "sms",
      provider: "webhook_forward",
      stubbed: true,
      detail: "Draft forward disabled (WEBHOOK_FORWARD_ON_DRAFT!=true).",
    };
  }
  const secret = process.env.WEBHOOK_FORWARD_SECRET;
  const body = {
    event: opts.event,
    rsvp: opts.rsvp,
    site: opts.site || null,
    sentAt: new Date().toISOString(),
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Webhook-Secret": secret } : {}),
      },
      body: JSON.stringify(body),
    });
    return {
      ok: res.ok,
      channel: "sms",
      provider: "webhook_forward",
      stubbed: false,
      detail: `Forwarded ${opts.event} → webhook (${res.status})`,
    };
  } catch (err) {
    console.warn("[notifications:webhook_forward:error]", err);
    return {
      ok: false,
      channel: "sms",
      provider: "webhook_forward",
      stubbed: false,
      detail: "Webhook forward failed (RSVP still saved locally).",
    };
  }
}

export function partySiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.landonandjordan.com";
}

export function neonEmailTemplate(opts: {
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  eyebrow?: string;
}): string {
  const eyebrow = opts.eyebrow
    ? `<p style="text-align:center;margin:0 0 10px;color:#c6ff00;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700">${opts.eyebrow}</p>`
    : "";
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="text-align:center;margin:28px 0 8px">
          <a href="${opts.ctaUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;border:2px solid #c6ff00;background:transparent;color:#c6ff00;font-weight:800;text-decoration:none;letter-spacing:0.06em;box-shadow:0 0 8px rgba(198,255,0,0.45),0 0 22px rgba(198,255,0,0.28)">${opts.ctaLabel}</a>
        </p>`
      : "";
  return `<!DOCTYPE html><html><body style="margin:0;background:#07010f;color:#fff;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;background:radial-gradient(ellipse at 50% 0%,rgba(120,40,180,0.35),transparent 55%),#07010f">
    <div style="border:2px solid #ff2bd6;border-radius:18px;padding:30px 26px;box-shadow:0 0 18px rgba(255,43,214,0.45),0 0 40px rgba(255,43,214,0.18),inset 0 0 40px rgba(255,43,214,0.06);background:linear-gradient(165deg,#1a0530 0%,#120822 48%,#0a0014 100%)">
      <p style="text-align:center;color:#FFD700;font-size:22px;margin:0 0 6px;text-shadow:0 0 12px rgba(255,215,0,0.55)">♛</p>
      ${eyebrow}
      <h1 style="text-align:center;color:#ff2bd6;font-size:26px;line-height:1.2;margin:0 0 18px;text-shadow:0 0 12px #ff2bd6,0 0 28px rgba(255,43,214,0.45)">${opts.headline}</h1>
      <div style="color:#f3e8ff;line-height:1.6;font-size:15px">${opts.bodyHtml}</div>
      ${cta}
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin:24px 0 0;letter-spacing:0.04em">Landon &amp; Jordan · 80s Birthday Party</p>
    </div>
  </div>
</body></html>`;
}

/** Pretty door-list block for confirmation / owner emails. */
export function namedPeopleEmailList(
  people: { fullName?: string; firstName?: string; lastName?: string; age?: string }[],
): string {
  const names = people
    .map((person) => {
      const base =
        (person.fullName || `${person.firstName || ""} ${person.lastName || ""}`.trim()).trim();
      if (!base) return "";
      const age = person.age?.trim();
      return age ? `${base} (age ${age})` : base;
    })
    .filter(Boolean);
  if (names.length === 0) {
    return `<p style="margin:12px 0;color:#c4b5d8">No names on this RSVP yet.</p>`;
  }
  return `<ul style="margin:12px 0 16px;padding:12px 12px 12px 28px;border:1px solid rgba(255,43,214,0.35);border-radius:12px;background:rgba(255,43,214,0.07);list-style:disc">${names
    .map(
      (name) =>
        `<li style="margin:0 0 6px;color:#fff">${escapeHtml(name)}</li>`,
    )
    .join("")}</ul>`;
}
