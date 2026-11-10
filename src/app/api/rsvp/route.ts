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
import { readRsvps, saveRsvp, supabaseRsvpEnabled } from "@/lib/rsvp-db";
import { getStore, updateStore } from "@/lib/store";
import type { AttendStatus, RsvpRecord, RsvpStatus } from "@/lib/types";

async function remember(record: RsvpRecord) {
  if (supabaseRsvpEnabled()) {
    await saveRsvp(record);
  }
  await updateStore((s) => {
    const idx = s.rsvps.findIndex((r) => r.id === record.id);
    if (idx >= 0) s.rsvps[idx] = record;
    else s.rsvps.unshift(record);
  });
}

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
    const already = (await readRsvps(current.rsvps)).find((r) => r.id === draftId);
    if (already?.formCompletedAt) {
      return NextResponse.json({
        ok: true,
        id: draftId,
        locked: true,
        guestCount: already.guestCount,
      });
    }
    const now = new Date().toISOString();
    const next = draft.value;
    const base: RsvpRecord = already || {
      id: draftId,
      firstName: "",
      lastName: "",
      fullName: "",
      attend: "yes",
      guestCount: 0,
      companions: [],
      phone: "",
      email: "",
      dietary: "",
      dietaryNotes: "",
      anythingElse: "",
      specialRequests: "",
      status: "incomplete",
      createdAt: now,
      updatedAt: now,
      formStartedAt: now,
      formCompletedAt: null,
      lastFieldTouched: null,
      abandoned: true,
    };
    const saved: RsvpRecord = {
      ...base,
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
      lastFieldTouched: body.lastFieldTouched ?? base.lastFieldTouched,
      updatedAt: now,
      abandoned: true,
      status: "incomplete",
    };
    try {
      await remember(saved);
    } catch (err) {
      console.warn("[rsvp:draft:save]", err);
      return NextResponse.json({ error: "Could not save your progress. Try again." }, { status: 503 });
    }
    const listed = await readRsvps((await getStore()).rsvps);
    if (saved) {
      void forwardRsvpWebhook({
        event: "rsvp.draft",
        rsvp: saved as unknown as Record<string, unknown>,
        site: {
          eventDate: current.content.eventDate,
          eventVenue: current.content.eventVenue,
          eventTime: current.content.eventTime,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      id: draftId,
      abandoned: true,
      guestCount: saved?.guestCount ?? 0,
      count: listed.length,
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

  const prior = (await readRsvps((await getStore()).rsvps)).find((r) => r.id === id);
  if (prior) {
    record.createdAt = prior.createdAt;
    record.formStartedAt = prior.formStartedAt || record.formStartedAt;
  }
  try {
    await remember(record);
  } catch (err) {
    console.warn("[rsvp:complete:save]", err);
    return NextResponse.json(
      { error: "We got your answers but could not save them. Please submit again." },
      { status: 503 },
    );
  }

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
  const partyTitle = `${escapeHtml(content.heroScript)} ${escapeHtml(content.heroChrome)} ${escapeHtml(content.heroSubtitle)}`;
  const whenWhere = `<p><strong>${escapeHtml(content.eventDate)}</strong><br/>${escapeHtml(content.eventTime)}<br/>${escapeHtml(content.eventVenue)}<br/>${escapeHtml(content.eventAddress)}</p>`;
  const guestHtml = neonEmailTemplate({
    headline: coming ? "You're on the list!" : "Thanks for telling us",
    bodyHtml: coming
      ? `<p>Hey ${safeName},</p><p>This is going to be a night. Landon and Jordan are so excited you're coming to <strong>${partyTitle}</strong>.</p>${whenWhere}<p>We have <strong>${record.guestCount}</strong> ${record.guestCount === 1 ? "name" : "names"} from you:</p>${namedPeople(record)}<p>${dietaryLine}<br/>${extraLine}</p><p>Every adult and child needs a first and last name on this invite. If someone isn't listed, they won't be able to come in. Lace up, dress 80s, and we'll see you on the floor.</p>`
      : `<p>Hey ${safeName},</p><p>Thank you for writing back. We'll miss you at <strong>${partyTitle}</strong>, and we're glad you told us.</p>${whenWhere}<p>This reply is marked as not coming, so the headcount from you is <strong>0</strong>.</p>`,
    ctaLabel: "View Invite",
    ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.landonandjordan.com",
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
      headline: coming ? "Someone's coming!" : "RSVP update",
      bodyHtml: `<p><strong>${safeName}</strong> just sent an RSVP.</p><p>${escapeHtml(record.email)}<br/>${escapeHtml(record.phone || "no phone")}<br/>${escapeHtml(record.status)} · headcount <strong>${record.guestCount}</strong></p>${namedPeople(record)}<p>${dietaryLine}<br/>${extraLine}</p><p>Finished replies land here. People who only started the form stay under In progress in admin.</p>`,
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
    try {
      await remember(record);
    } catch (err) {
      console.warn("[rsvp:confirm-stamp]", err);
    }
  }

  return NextResponse.json({
    ok: true,
    rsvp: record,
    notifications: { guestMail, ownerMail, ownerSms, webhook },
  });
}
