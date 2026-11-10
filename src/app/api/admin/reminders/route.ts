import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import {
  escapeHtml,
  neonEmailTemplate,
  sendGuestEmail,
  sendOwnerEmail,
} from "@/lib/notifications";
import { readRsvps } from "@/lib/rsvp-db";
import { getStore, updateStore } from "@/lib/store";
import type { ReminderLog } from "@/lib/types";


export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const rsvps = await readRsvps(store.rsvps);
  const abandoned = rsvps.filter((r) => r.abandoned || r.status === "incomplete");
  return NextResponse.json({
    reminders: store.reminders,
    abandoned,
    hint: "Schedule via Vercel cron or Supabase Edge later. Trigger manually here for now.",
  });
}

export async function POST(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const kind = (body.kind || "party_reminder") as ReminderLog["kind"];
  const store = await getStore();
  const rsvps = await readRsvps(store.rsvps);
  const content = store.content;
  const now = new Date().toISOString();

  if (kind === "abandoned_digest") {
    const abandoned = rsvps.filter((r) => r.abandoned || r.status === "incomplete");
    await sendOwnerEmail({
      subject: `Abandoned RSVPs digest (${abandoned.length})`,
      html: neonEmailTemplate({
        headline: "Incomplete RSVPs",
        bodyHtml:
          abandoned.length === 0
            ? "<p>No abandoned forms right now.</p>"
            : `<ul>${abandoned
                .map(
                  (r) =>
                    `<li>${escapeHtml(r.fullName || "(no name)")} — ${escapeHtml(r.email || "no email")} — last: ${escapeHtml(r.lastFieldTouched || "?")}</li>`,
                )
                .join("")}</ul>`,
      }),
    });
    const log: ReminderLog = {
      id: uid("rem"),
      kind,
      note: `Owner digest for ${abandoned.length} incomplete form(s)`,
      status: "stubbed",
      createdAt: now,
    };
    await updateStore((s) => {
      s.reminders.unshift(log);
    });
    return NextResponse.json({ ok: true, reminder: log, abandoned });
  }

  const guests = rsvps.filter((r) => r.status === "confirmed" || r.attend === "yes");
  for (const g of guests) {
    await sendGuestEmail({
      to: g.email,
      subject: `Reminder: ${content.eventDate} at ${content.eventVenue}`,
      html: neonEmailTemplate({
        headline: "See you on the floor!",
        bodyHtml: `<p>Hey ${escapeHtml(g.fullName)},</p><p>Quick reminder — <strong>${escapeHtml(content.eventDate)}</strong> · ${escapeHtml(content.eventTime)}</p><p>${escapeHtml(content.eventVenue)}<br/>${escapeHtml(content.eventAddress)}</p><p>Dress code: ${escapeHtml(content.dressCode)}</p>`,
        ctaLabel: "Open Invite",
        ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      }),
    });
  }

  const log: ReminderLog = {
    id: uid("rem"),
    kind: "party_reminder",
    note: `Party reminder stubbed to ${guests.length} attending guest(s)`,
    status: "stubbed",
    createdAt: now,
  };
  await updateStore((s) => {
    s.reminders.unshift(log);
  });
  return NextResponse.json({ ok: true, reminder: log, recipientCount: guests.length });
}
