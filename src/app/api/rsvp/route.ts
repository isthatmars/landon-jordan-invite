import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  forwardRsvpWebhook,
  neonEmailTemplate,
  sendGuestEmail,
  sendOwnerEmail,
  sendOwnerSms,
} from "@/lib/notifications";
import { getStore, updateStore } from "@/lib/store";
import type { AttendStatus, RsvpRecord, RsvpStatus } from "@/lib/types";


function attendToStatus(attend: AttendStatus): RsvpStatus {
  if (attend === "yes") return "confirmed";
  if (attend === "no") return "declined";
  return "maybe";
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

  // Abandoned / partial capture
  if (action === "draft") {
    const draftId = (body.id as string) || uid("draft");
    const store = await updateStore((s) => {
      const existing = s.rsvps.find((r) => r.id === draftId);
      const now = new Date().toISOString();
      if (existing) {
        existing.fullName = body.fullName ?? existing.fullName;
        existing.attend = body.attend ?? existing.attend;
        existing.guestCount = Number(body.guestCount ?? existing.guestCount) || 1;
        existing.phone = body.phone ?? existing.phone;
        existing.email = body.email ?? existing.email;
        existing.specialRequests = body.specialRequests ?? existing.specialRequests;
        existing.lastFieldTouched = body.lastFieldTouched ?? existing.lastFieldTouched;
        existing.updatedAt = now;
        existing.abandoned = !existing.formCompletedAt;
        existing.status = existing.formCompletedAt ? existing.status : "incomplete";
      } else {
        s.rsvps.unshift({
          id: draftId,
          fullName: body.fullName || "",
          attend: (body.attend as AttendStatus) || "yes",
          guestCount: Number(body.guestCount) || 1,
          phone: body.phone || "",
          email: body.email || "",
          specialRequests: body.specialRequests || "",
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
    const draft = store.rsvps.find((r) => r.id === draftId);
    if (draft) {
      void forwardRsvpWebhook({
        event: "rsvp.draft",
        rsvp: draft as unknown as Record<string, unknown>,
        site: {
          eventDate: store.content.eventDate,
          eventVenue: store.content.eventVenue,
          eventTime: store.content.eventTime,
        },
      });
    }
    return NextResponse.json({ ok: true, id: draftId, abandoned: true, count: store.rsvps.length });
  }

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const attend = (body.attend as AttendStatus) || "yes";
  if (!fullName || !email) {
    return NextResponse.json({ error: "Full name and email are required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = (body.id as string) || uid("rsvp");
  const record: RsvpRecord = {
    id,
    fullName,
    attend,
    guestCount: Math.max(1, Number(body.guestCount) || 1),
    phone: String(body.phone || "").trim(),
    email,
    specialRequests: String(body.specialRequests || "").trim(),
    status: attendToStatus(attend),
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
  const guestHtml = neonEmailTemplate({
    headline: "You're on the list!",
    bodyHtml: `<p>Hey ${fullName},</p><p>We got your RSVP for <strong>${content.heroScript} ${content.heroChrome} ${content.heroSubtitle}</strong>.</p><p><strong>${content.eventDate}</strong><br/>${content.eventVenue}<br/>${content.eventTime}</p><p>Status: <strong>${record.status}</strong> · Guests: ${record.guestCount}</p>`,
    ctaLabel: "View Invite",
    ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  });

  const guestMail = await sendGuestEmail({
    to: email,
    subject: `RSVP confirmed — ${content.brandName} 80s Party`,
    html: guestHtml,
  });
  const ownerMail = await sendOwnerEmail({
    subject: `New RSVP: ${fullName} (${record.status})`,
    html: neonEmailTemplate({
      headline: "New RSVP",
      bodyHtml: `<p><strong>${fullName}</strong> · ${email}<br/>${record.status} · ${record.guestCount} guest(s)<br/>${record.phone || "no phone"}</p><p>${record.specialRequests || ""}</p>`,
    }),
  });
  const ownerSms = await sendOwnerSms(
    `RSVP: ${fullName} (${record.status}) · ${record.guestCount} guest(s) · ${email}`,
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
