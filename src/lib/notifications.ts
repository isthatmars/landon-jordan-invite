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

/** True when guest/admin email can leave the machine via Resend. */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function resendSetupHint(): string {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) missing.push("RESEND_API_KEY");
  if (!process.env.RESEND_FROM_EMAIL?.trim()) missing.push("RESEND_FROM_EMAIL");
  if (missing.length === 0) {
    return "Resend is configured — segment email sends go live.";
  }
  return `Email not live yet. Set ${missing.join(" + ")} in the host env (Vercel/Cursor secrets), then redeploy. Sends are logged until then.`;
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
      detail: resendSetupHint(),
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
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.landonandjordan.com").trim();
  return raw.replace(/\/$/, "") || "https://www.landonandjordan.com";
}

/** Absolute public asset URL for outbound email HTML (clients need full https URLs). */
export function partyAssetUrl(path: string): string {
  const base = partySiteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/**
 * Neon party email shell — matches the invite hero:
 * Miami terrace bg, couple cutout, script + chrome brand,
 * darkened details-bar overlay holding editable headline/body/CTA.
 * Table layout + inline CSS for common email clients.
 */
export function neonEmailTemplate(opts: {
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  eyebrow?: string;
}): string {
  const origin = partySiteUrl();
  const heroBg = partyAssetUrl("/images/hero-bg-miami.jpg");
  const couple = partyAssetUrl("/images/hero-couple-cutout-cartoon.png");
  const chrome = partyAssetUrl("/images/chrome-80s.png");
  const inviteHref = opts.ctaUrl || origin;

  const eyebrow = opts.eyebrow
    ? `<p style="Margin:0 0 10px;color:#c6ff00;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;font-family:Helvetica,Arial,sans-serif">${opts.eyebrow}</p>`
    : "";
  const cta =
    opts.ctaLabel && inviteHref
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="Margin:22px auto 6px">
          <tr>
            <td align="center" bgcolor="transparent" style="border-radius:999px;border:2px solid #c6ff00;box-shadow:0 0 8px rgba(198,255,0,0.4)">
              <a href="${inviteHref}" style="display:inline-block;padding:13px 26px;border-radius:999px;color:#c6ff00;font-weight:800;text-decoration:none;letter-spacing:0.06em;font-family:Helvetica,Arial,sans-serif;font-size:14px">${opts.ctaLabel}</a>
            </td>
          </tr>
        </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<title>${opts.headline}</title>
<!--[if mso]>
<style type="text/css">
  body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="Margin:0;padding:0;background:#07010f;color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${opts.headline}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07010f;border-collapse:collapse">
    <tr>
      <td align="center" style="padding:20px 12px">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-collapse:collapse">
          <!-- Hero stage: Miami bg + couple + brand -->
          <tr>
            <td background="${heroBg}" bgcolor="#1a0a28" style="background-image:url('${heroBg}');background-size:cover;background-position:center top;background-repeat:no-repeat;background-color:#1a0a28;border:2px solid #ff2bd6;border-bottom:0;border-radius:18px 18px 0 0">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:560px;">
              <v:fill type="frame" src="${heroBg}" color="#1a0a28" />
              <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:rgba(7,1,15,0.52)">
                <tr>
                  <td style="padding:22px 16px 10px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                      <tr>
                        <td width="46%" valign="bottom" style="width:46%;vertical-align:bottom;padding:0 4px 0 0">
                          <img src="${couple}" width="230" alt="Landon and Jordan in 80s windbreakers" style="display:block;width:100%;max-width:230px;height:auto;border:0;outline:none;text-decoration:none" />
                        </td>
                        <td width="54%" valign="middle" align="center" style="width:54%;vertical-align:middle;padding:6px 0 10px 4px;text-align:center">
                          <p style="Margin:0 0 2px;color:#FFD700;font-size:20px;line-height:1;text-shadow:0 0 12px rgba(255,215,0,0.55)">&#9813;</p>
                          <p style="Margin:0 0 4px;color:#ffffff;font-size:26px;line-height:1.05;font-family:Georgia,'Brush Script MT','Segoe Script',cursive;font-style:italic;font-weight:400;text-shadow:0 2px 10px rgba(0,0,0,0.55)">Landon &amp; Jordan's</p>
                          <img src="${chrome}" width="150" alt="80s" style="display:block;margin:2px auto 6px auto;width:150px;max-width:72%;height:auto;border:0;outline:none" />
                          <p style="Margin:0;color:#ffffff;font-size:12px;letter-spacing:0.28em;text-transform:uppercase;font-weight:800;font-family:Helvetica,Arial,sans-serif;text-shadow:0 1px 6px rgba(0,0,0,0.55)">Birthday Party</p>
                          <p style="Margin:6px 0 0;line-height:0;font-size:0">
                            <span style="display:inline-block;width:54px;height:3px;background-color:#c6ff00;border-radius:999px;box-shadow:0 0 8px rgba(198,255,0,0.7)"></span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!--[if gte mso 9]>
              </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>
          <!-- Darkened details-bar overlay: editable email content -->
          <tr>
            <td background="${heroBg}" bgcolor="#07010f" style="background-image:url('${heroBg}');background-size:cover;background-position:center bottom;background-repeat:no-repeat;background-color:#07010f;border:2px solid #ff2bd6;border-top:0;border-radius:0 0 18px 18px;padding:0 12px 14px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                <tr>
                  <td bgcolor="#0a0614" style="background-color:rgba(7,1,15,0.88);background-image:linear-gradient(180deg,rgba(10,6,20,0.92),rgba(7,1,15,0.94));border:1px solid rgba(255,43,214,0.35);border-radius:14px;padding:22px 20px 20px;box-shadow:0 0 18px rgba(255,43,214,0.28),inset 0 0 28px rgba(255,43,214,0.06)">
                    ${eyebrow}
                    <h1 style="Margin:0 0 14px;color:#ff2bd6;font-size:24px;line-height:1.25;font-weight:800;font-family:Helvetica,Arial,sans-serif;text-shadow:0 0 12px #ff2bd6,0 0 28px rgba(255,43,214,0.45)">${opts.headline}</h1>
                    <div style="color:#f3e8ff;line-height:1.65;font-size:15px;font-family:Helvetica,Arial,sans-serif">${opts.bodyHtml}</div>
                    ${cta}
                    <p style="Margin:20px 0 0;text-align:center;color:#9ca3af;font-size:12px;letter-spacing:0.04em;font-family:Helvetica,Arial,sans-serif">
                      <a href="${origin}" style="color:#c4b5d8;text-decoration:none">Landon &amp; Jordan &#183; 80s Birthday Party</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
