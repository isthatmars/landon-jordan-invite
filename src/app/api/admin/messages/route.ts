import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import {
  escapeHtml,
  getSmsProvider,
  isResendConfigured,
  neonEmailTemplate,
  resendSetupHint,
  sendGuestEmail,
  sendGuestSmsBlast,
  type NotifyResult,
  type SmsProviderId,
} from "@/lib/notifications";
import { readRsvps } from "@/lib/rsvp-db";
import { getStore, updateStore } from "@/lib/store";
import type { MessageLog, RsvpRecord } from "@/lib/types";

function pickRecipients(
  rsvps: RsvpRecord[],
  segment: MessageLog["segment"],
  ids?: string[],
): RsvpRecord[] {
  if (segment === "one" || segment === "selected") {
    const set = new Set(ids || []);
    return rsvps.filter((r) => set.has(r.id) && r.email);
  }
  if (segment === "attending") {
    return rsvps.filter(
      (r) => (r.status === "confirmed" || r.attend === "yes") && !!r.email?.trim(),
    );
  }
  if (segment === "incomplete") {
    return rsvps.filter(
      (r) => (r.abandoned || r.status === "incomplete") && !!r.email?.trim(),
    );
  }
  return rsvps.filter((r) => !!r.email?.trim());
}

function summarizeEmailResults(
  results: NotifyResult[],
  recipientCount: number,
): { status: MessageLog["status"]; note: string } {
  if (recipientCount === 0) {
    return {
      status: "failed",
      note: "No recipients with email addresses in that segment.",
    };
  }

  const failed = results.filter((r) => !r.ok);
  const stubbed = results.filter((r) => r.stubbed);
  const sent = results.filter((r) => r.ok && !r.stubbed);

  if (failed.length === results.length) {
    return {
      status: "failed",
      note:
        failed[0]?.detail ||
        `All ${recipientCount} email(s) failed. Check Resend API key / from-address.`,
    };
  }

  if (stubbed.length === results.length) {
    return {
      status: "stubbed",
      note: resendSetupHint(),
    };
  }

  if (failed.length > 0) {
    return {
      status: "failed",
      note: `Sent ${sent.length} of ${recipientCount}; ${failed.length} failed. ${failed[0]?.detail || ""}`.trim(),
    };
  }

  return {
    status: "sent",
    note: `Sent neon email to ${sent.length} guest${sent.length === 1 ? "" : "s"} via Resend.`,
  };
}

export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const emailLive = isResendConfigured();
  return NextResponse.json({
    messages: store.messages,
    smsProvider: getSmsProvider(),
    smsNote:
      "Email-first. Guest SMS default off. Prefer WhatsApp / export / light tools over Twilio A2P 10DLC.",
    emailLive,
    emailNote: resendSetupHint(),
  });
}

export async function POST(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.channel || !body?.body) {
    return NextResponse.json({ error: "channel and body required" }, { status: 400 });
  }

  const store = await getStore();
  const segment = (body.segment || "all") as MessageLog["segment"];
  const recipients = pickRecipients(await readRsvps(store.rsvps), segment, body.recipientIds);
  const now = new Date().toISOString();
  const log: MessageLog = {
    id: uid("msg"),
    channel: body.channel,
    subject: body.subject,
    body: body.body,
    segment,
    recipientIds: recipients.map((r) => r.id),
    recipientCount: recipients.length,
    status: "stubbed",
    createdAt: now,
  };

  let note = "";

  if (body.channel === "email") {
    const safeBody = escapeHtml(String(body.body)).replace(/\n/g, "<br/>");
    const html = neonEmailTemplate({
      eyebrow: "Party broadcast",
      headline: escapeHtml(String(body.subject || "Party Update")),
      bodyHtml: `<div>${safeBody}</div>`,
      ctaLabel: "Open Invite",
      ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.landonandjordan.com",
    });
    const results: NotifyResult[] = [];
    for (const r of recipients) {
      results.push(
        await sendGuestEmail({
          to: r.email,
          subject: body.subject || "Landon & Jordan's 80s Party",
          html,
        }),
      );
    }
    const summary = summarizeEmailResults(results, recipients.length);
    log.status = summary.status;
    note = summary.note;
  } else {
    const provider = (body.smsProvider as SmsProviderId) || getSmsProvider();
    const result = await sendGuestSmsBlast({
      provider,
      bodies: recipients
        .filter((r) => r.phone)
        .map((r) => ({ to: r.phone, body: String(body.body) })),
    });
    log.status = result.ok ? "stubbed" : "failed";
    note =
      result.detail ||
      "SMS is pluggable & optional. Email remains the primary guest channel.";
  }

  await updateStore((s) => {
    s.messages.unshift(log);
  });

  return NextResponse.json({
    ok: log.status !== "failed",
    message: log,
    emailLive: isResendConfigured(),
    smsProvider: getSmsProvider(),
    note,
  });
}
