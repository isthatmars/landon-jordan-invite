import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import {
  getSmsProvider,
  neonEmailTemplate,
  sendGuestEmail,
  sendGuestSmsBlast,
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
    return rsvps.filter((r) => r.status === "confirmed" || r.attend === "yes");
  }
  if (segment === "incomplete") {
    return rsvps.filter((r) => r.abandoned || r.status === "incomplete");
  }
  return rsvps.filter((r) => !!r.email);
}

export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  return NextResponse.json({
    messages: store.messages,
    smsProvider: getSmsProvider(),
    smsNote:
      "Email-first. Guest SMS default off. Prefer WhatsApp / export / light tools over Twilio A2P 10DLC.",
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

  if (body.channel === "email") {
    const html = neonEmailTemplate({
      headline: body.subject || "Party Update",
      bodyHtml: `<div>${String(body.body).replace(/\n/g, "<br/>")}</div>`,
      ctaLabel: "Open Invite",
      ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.landonandjordan.com",
    });
    for (const r of recipients) {
      await sendGuestEmail({
        to: r.email,
        subject: body.subject || "Landon & Jordan's 80s Party",
        html,
      });
    }
    log.status = "stubbed";
  } else {
    const provider = (body.smsProvider as SmsProviderId) || getSmsProvider();
    const result = await sendGuestSmsBlast({
      provider,
      bodies: recipients
        .filter((r) => r.phone)
        .map((r) => ({ to: r.phone, body: String(body.body) })),
    });
    log.status = result.ok ? "stubbed" : "failed";
  }

  await updateStore((s) => {
    s.messages.unshift(log);
  });

  return NextResponse.json({
    ok: true,
    message: log,
    smsProvider: getSmsProvider(),
    note:
      body.channel === "sms"
        ? "SMS is pluggable & optional. Email remains the primary guest channel."
        : "Rendered into neon email template (Resend stub).",
  });
}
