import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  escapeHtml,
  forwardRsvpWebhook,
  neonEmailTemplate,
  sendGuestEmail,
  sendOwnerEmail,
  sendOwnerSms,
} from "@/lib/notifications";
import { headcountFor, isComing, parseCompletedRsvp, parseDraftRsvp } from "@/lib/rsvp";
import { getStore, updateStore } from "@/lib/store";
import type { AttendStatus, RsvpRecord, RsvpStatus } from "@/lib/types";

function attendToStatus(attend: AttendStatus): RsvpStatus {
  if (attend === "yes") return "confirmed";
  if (attend === "no") return "declined";
  return "maybe";
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, 180);
}

function namedPeople(record: Pick<RsvpRecord, "fullName" | "companions">): string {
  const names = [
    record.fullName,
    ...record.companions.map((person) => `${person.firstName} ${person.lastName}`.trim()),
  ].filter(Boolean);
  if (names.length === 0) return "<p>No names yet.</p>";
  return `<ul>${names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}</ul>`;
}

export async function GET() {
  // Public list intentionally not exposed — admin only.
  return NextResponse.json({ ok: true, message: "Use POST to submit; admin lists RSVPs." });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const action = body.action as string | undefined;

  if (action === "draft") {
    const draft = parseDraftRsvp(body);
    if (!draft.ok) {
      return NextResponse.json({ error: draft.error }, { status: 400 });
    }
    const draftId = (body.id as string) || uid("draft");
    const current = await getStore();
    const already = current.rsvps.find((r) => r.id === draftId);
    if (already?.formCompletedAt) {
      return NextResponse.json({
        ok: true,
        id: draftId,
        locked: true,
        guestCount: already.guestCount,
      });
    }
    const store = await updateStore((s) => {
      const existing = s.rsvps.find((r) => r.id === draftId);
      if (existing?.formCompletedAt) return;
      const now = new Date().toISOString();
      const next = draft.value;
      if (existing) {
        existing.firstName = next.firstName;
        existing.lastName = next.lastName;
        existing.fullName = next.fullName;
        existing.attend = next.attend;
        existing.guestCount = next.guestCount;
        existing.companions = next.companions;
        existing.phone = next.phone;
        existing.email = next.email;
        existing.dietary = next.dietary;
        existing.dietaryNotes = next.dietaryNotes;
        existing.anythingElse = next.anythingElse;
        existing.specialRequests = next.specialRequests;
        existing.lastFieldTouched = body.lastFieldTouched ?? existing.lastFieldTouched;
        existing.updatedAt = now;
        existing.abandoned = !existing.formCompletedAt;
        existing.status = existing.formCompletedAt ? existing.status : "incomplete";
      } else {
        s.rsvps.unshift({
          id: draftId,
          firstName: next.firstName,
          lastName: next.lastName,
          fullName: next.fullName,
          attend: next.attend,
          guestCount: next.guestCount,
          companions: next.companions,
          phone: next.phone,
          email: next.email,
          dietary: next.dietary,
          dietaryNotes: next.dietaryNotes,
          anythingElse: next.anythingElse,
          specialRequests: next.specialRequests,
          status: "incomplete",
          createdAt: now,
          updatedAt: now,
          formStartedAt: now,
          formCompletedAt: null,
          lastFieldTouched: body.lastFieldTouched || null,
          abandoned: true,
        });
      }
    });
    const saved = store.rsvps.find((r) => r.id === draftId);
    if (saved) {
      void forwardRsvpWebhook({
        event: "rsvp.draft",
        rsvp: saved as unknown as Record<string, unknown>,
        site: {
          eventDate: store.content.eventDate,
          eventVenue: store.content.eventVenue,
          eventTime: store.content.eventTime,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      id: draftId,
      abandoned: true,
      guestCount: saved?.guestCount ?? 0,
      count: store.rsvps.length,
    });
  }

  const parsed = parseCompletedRsvp(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = (body.id as string) || uid("rsvp");
  const value = parsed.value;
  const record: RsvpRecord = {
    id,
    firstName: value.firstName,
    lastName: value.lastName,
    fullName: value.fullName,
    attend: value.attend,
    guestCount: headcountFor(value.attend, value.companions),
    companions: value.companions,
    phone: value.phone,
    email: value.email,
    dietary: value.dietary,
    dietaryNotes: value.dietaryNotes,
    anythingElse: value.anythingElse,
    specialRequests: value.specialRequests,
    status: attendToStatus(value.attend),
    confirmationSentAt: null,
    createdAt: now,
    updatedAt: now,
    formStartedAt: body.formStartedAt || now,
    formCompletedAt: now,
    lastFieldTouched: null,
    abandoned: false,
  };

  await updateStore((s) => {
    const idx = s.rsvps.findIndex((r) => r.id === id);
    if (idx >= 0) {
      record.createdAt = s.rsvps[idx].createdAt;
      record.formStartedAt = s.rsvps[idx].formStartedAt || record.formStartedAt;
      s.rsvps[idx] = record;
    } else {
      s.rsvps.unshift(record);
    }
  });

  const content = (await getStore()).content;
  const coming = isComing(record.attend);
  const safeName = escapeHtml(record.fullName);
  const dietaryLine =
    record.dietary === "yes"
      ? `Dietary: ${escapeHtml(record.dietaryNotes)}`
      : "Dietary: none";
  const extraLine =
    record.anythingElse === "yes"
      ? `Anything else: ${escapeHtml(record.specialRequests)}`
      : "Anything else: no";
  const guestHtml = neonEmailTemplate({
    headline: coming ? "You're on the list!" : "Thanks for letting us know",
    bodyHtml: coming
      ? `<p>Hey ${safeName},</p><p>We got your RSVP for <strong>${escapeHtml(content.heroScript)} ${escapeHtml(content.heroChrome)} ${escapeHtml(content.heroSubtitle)}</strong>.</p><p><strong>${escapeHtml(content.eventDate)}</strong><br/>${escapeHtml(content.eventTime)}<br/>${escapeHtml(content.eventVenue)}<br/>${escapeHtml(content.eventAddress)}</p><p>Headcount: <strong>${record.guestCount}</strong></p>${namedPeople(record)}<p>${dietaryLine}<br/>${extraLine}</p>`
      : `<p>Hey ${safeName},</p><p>We'll miss you at <strong>${escapeHtml(content.heroScript)} ${escapeHtml(content.heroChrome)} ${escapeHtml(content.heroSubtitle)}</strong>.</p><p>Headcount for this reply: <strong>0</strong>.</p>`,
    ctaLabel: "View Invite",
    ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  });

  const guestMail = await sendGuestEmail({
    to: record.email,
    subject: coming
      ? `RSVP confirmed — ${oneLine(content.brandName)} 80s Party`
      : `RSVP received — ${oneLine(content.brandName)} 80s Party`,
    html: guestHtml,
  });
  const ownerMail = await sendOwnerEmail({
    subject: `New RSVP: ${oneLine(record.fullName)} (${record.status})`,
    html: neonEmailTemplate({
      headline: "New RSVP",
      bodyHtml: `<p><strong>${safeName}</strong> · ${escapeHtml(record.email)}<br/>${escapeHtml(record.status)} · headcount ${record.guestCount}<br/>${escapeHtml(record.phone || "no phone")}</p>${namedPeople(record)}<p>${dietaryLine}<br/>${extraLine}</p>`,
    }),
  });
  const ownerSms = await sendOwnerSms(
    `RSVP: ${oneLine(record.fullName)} (${record.status}) · headcount ${record.guestCount} · ${oneLine(record.email)}`,
  );
  const webhook = await forwardRsvpWebhook({
    event: "rsvp.completed",
    rsvp: record as unknown as Record<string, unknown>,
    site: {
      eventDate: content.eventDate,
      eventVenue: content.eventVenue,
      eventTime: content.eventTime,
    },
  });

  if (guestMail.ok) {
    const sentAt = new Date().toISOString();
    record.confirmationSentAt = sentAt;
    await updateStore((s) => {
      const r = s.rsvps.find((x) => x.id === id);
      if (r) r.confirmationSentAt = sentAt;
    });
  }

  return NextResponse.json({
    ok: true,
    rsvp: record,
    notifications: { guestMail, ownerMail, ownerSms, webhook },
  });
}
