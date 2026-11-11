import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import {
  escapeHtml,
  forwardRsvpWebhook,
  namedPeopleEmailList,
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

function partyPeople(record: Pick<RsvpRecord, "fullName" | "companions">) {
  return [
    { fullName: record.fullName },
    ...record.companions.map((person) => ({
      firstName: person.firstName,
      lastName: person.lastName,
      age: person.age,
    })),
  ];
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
  const peopleBlock = namedPeopleEmailList(partyPeople(record));
  const dietaryLine =
    record.dietary === "yes" && record.dietaryNotes.trim()
      ? `<p style="margin:14px 0 0"><span style="color:#c6ff00;letter-spacing:0.12em;font-size:11px;text-transform:uppercase">Dietary</span><br/>${escapeHtml(record.dietaryNotes)}</p>`
      : `<p style="margin:14px 0 0;color:#c4b5d8">No dietary notes.</p>`;
  const extraLine =
    record.anythingElse === "yes" && record.specialRequests.trim()
      ? `<p style="margin:10px 0 0"><span style="color:#c6ff00;letter-spacing:0.12em;font-size:11px;text-transform:uppercase">Note</span><br/>${escapeHtml(record.specialRequests)}</p>`
      : "";
  const partyTitle = `${escapeHtml(content.heroScript)} ${escapeHtml(content.heroChrome)} ${escapeHtml(content.heroSubtitle)}`;
  const whenWhere = `<div style="margin:16px 0;padding:14px 16px;border-radius:12px;border:1px solid rgba(198,255,0,0.28);background:rgba(198,255,0,0.06)"><p style="margin:0;color:#c6ff00;font-size:11px;letter-spacing:0.16em;text-transform:uppercase">When &amp; where</p><p style="margin:8px 0 0;color:#fff;line-height:1.55"><strong>${escapeHtml(content.eventDate)}</strong><br/>${escapeHtml(content.eventTime)}<br/>${escapeHtml(content.eventVenue)}<br/>${escapeHtml(content.eventAddress)}</p></div>`;
  const guestHtml = neonEmailTemplate({
    eyebrow: coming ? "RSVP confirmed" : "Thanks for writing back",
    headline: coming ? "You're on the list!" : "We'll miss you",
    bodyHtml: coming
      ? `<p style="margin:0 0 12px">Hey ${safeName} — this is going to be a night. Landon and Jordan are so glad you're coming to <strong>${partyTitle}</strong>.</p>${whenWhere}<p style="margin:0 0 4px">Here's what you confirmed. Party size from you: <strong style="color:#c6ff00">${record.guestCount}</strong> ${record.guestCount === 1 ? "person" : "people"}.</p>${peopleBlock}${dietaryLine}<p style="margin:18px 0 0;color:#e9d5ff">Every adult and child needs a first and last name on this invite. If someone isn't listed, they won't be able to come in. Lace up, dress 80s, and we'll see you on the floor.</p>`
      : `<p style="margin:0 0 12px">Hey ${safeName}, thank you for letting us know. We'll miss you at <strong>${partyTitle}</strong>.</p>${whenWhere}<p style="margin:0">This reply is marked as not coming, so the headcount from you is <strong style="color:#c6ff00">0</strong>.</p>${extraLine}`,
    ctaLabel: "View Invite",
    ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.landonandjordan.com",
  });

  const guestMail = record.email.trim()
    ? await sendGuestEmail({
        to: record.email,
        subject: coming
          ? `You're in — ${oneLine(content.brandName)} 80s Party`
          : `RSVP received — ${oneLine(content.brandName)} 80s Party`,
        html: guestHtml,
      })
    : {
        ok: true,
        channel: "email" as const,
        provider: "resend",
        stubbed: true,
        detail: "No guest email — confirmation not sent.",
      };
  const kidsCount = record.companions.length;
  const ownerMail = await sendOwnerEmail({
    subject: `New RSVP: ${oneLine(record.fullName)} · ${record.guestCount} ${record.guestCount === 1 ? "guest" : "guests"} (${record.status})`,
    html: neonEmailTemplate({
      eyebrow: "Owner alert",
      headline: coming ? "Someone's coming!" : "RSVP update",
      bodyHtml: `<p style="margin:0 0 12px"><strong>${safeName}</strong> just sent an RSVP.</p><div style="margin:0 0 14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,43,214,0.3);background:rgba(255,43,214,0.06)"><p style="margin:0;line-height:1.55">${escapeHtml(record.email || "no email")}<br/>${escapeHtml(record.phone || "no phone")}<br/><span style="color:#c6ff00">${escapeHtml(record.status)}</span> · headcount <strong>${record.guestCount}</strong>${kidsCount ? ` · ${kidsCount} ${kidsCount === 1 ? "child" : "children"}` : ""}</p></div><p style="margin:0 0 4px;color:#c6ff00;font-size:11px;letter-spacing:0.14em;text-transform:uppercase">Named people</p>${peopleBlock}${dietaryLine}${extraLine}<p style="margin:18px 0 0;color:#c4b5d8;font-size:13px">Finished replies land here. People who only started the form stay under In progress in admin.</p>`,
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
