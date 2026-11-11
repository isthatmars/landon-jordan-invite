import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  dietaryBlockHtml,
  mergeEmailTemplates,
  namedPeopleEmailList,
  renderEditableEmail,
} from "@/lib/email-templates";
import {
  forwardRsvpWebhook,
  partySiteUrl,
  sendGuestEmail,
  sendOwnerEmail,
  sendOwnerSms,
} from "@/lib/notifications";
import {
  headcountFor,
  isComing,
  parseCompletedRsvp,
  parseDraftRsvp,
  partyPeople,
} from "@/lib/rsvp";
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

  const storeNow = await getStore();
  const content = storeNow.content;
  const templates = mergeEmailTemplates(storeNow.emailTemplates);
  const coming = isComing(record.attend);
  const peopleBlock = namedPeopleEmailList(partyPeople(record));
  const dietaryLine = dietaryBlockHtml(record);
  const inviteUrl = partySiteUrl();
  const guestVars = {
    guestName: record.fullName || "Friend",
    guestEmail: record.email || "no email",
    guestPhone: record.phone || "no phone",
    guestCount: record.guestCount,
    status: record.status,
    namedPeopleHtml: peopleBlock,
    dietaryBlockHtml: dietaryLine,
    inviteUrl,
  };
  const guestRendered = renderEditableEmail(
    coming ? templates.signup_confirm : templates.signup_declined,
    content,
    guestVars,
  );

  const guestMail = record.email.trim()
    ? await sendGuestEmail({
        to: record.email,
        subject: oneLine(guestRendered.subject),
        html: guestRendered.html,
      })
    : {
        ok: true,
        channel: "email" as const,
        provider: "resend",
        stubbed: true,
        detail: "No guest email — confirmation not sent.",
      };
  const ownerCopy = {
    ...templates.owner_alert,
    headline: coming ? templates.owner_alert.headline : "RSVP Update",
  };
  const ownerRendered = renderEditableEmail(ownerCopy, content, guestVars);
  const ownerMail = await sendOwnerEmail({
    subject: oneLine(ownerRendered.subject),
    html: ownerRendered.html,
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

  if (record.email.trim() && guestMail.ok) {
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
