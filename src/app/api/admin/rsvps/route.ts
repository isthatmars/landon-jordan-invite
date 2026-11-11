import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import {
  dietaryBlockHtml,
  mergeEmailTemplates,
  namedPeopleEmailList,
  renderEditableEmail,
} from "@/lib/email-templates";
import { partySiteUrl, sendGuestEmail } from "@/lib/notifications";
import {
  headcountFor,
  isAttendStatus,
  parseDraftRsvp,
  partyHeadcount,
  partyPeople,
} from "@/lib/rsvp";
import { readRsvps, saveRsvp, supabaseRsvpEnabled } from "@/lib/rsvp-db";
import { getStore, updateStore } from "@/lib/store";
import type { PartyPerson, RsvpRecord, RsvpStatus } from "@/lib/types";

async function persistRsvp(record: RsvpRecord) {
  if (supabaseRsvpEnabled()) await saveRsvp(record);
  await updateStore((s) => {
    const idx = s.rsvps.findIndex((row) => row.id === record.id);
    if (idx >= 0) s.rsvps[idx] = record;
    else s.rsvps.unshift(record);
  });
}


export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const all = await readRsvps(store.rsvps);
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  let rsvps = all;
  if (filter === "incomplete" || filter === "abandoned") {
    rsvps = rsvps.filter((r) => r.abandoned || r.status === "incomplete");
  } else if (filter === "attending") {
    rsvps = rsvps.filter((r) => r.status === "confirmed" || r.attend === "yes");
  }
  return NextResponse.json({ rsvps, headcount: partyHeadcount(all) });
}

export async function PATCH(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const action = body.action as string | undefined;
  const store = await getStore();
  const content = store.content;

  if (action === "resend") {
    const rsvp = (await readRsvps(store.rsvps)).find((r) => r.id === body.id);
    if (!rsvp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const templates = mergeEmailTemplates(store.emailTemplates);
    const coming = rsvp.status !== "declined" && rsvp.attend !== "no";
    const copy = coming ? templates.signup_confirm : templates.signup_declined;
    const rendered = renderEditableEmail(copy, content, {
      guestName: rsvp.fullName || "Friend",
      guestEmail: rsvp.email,
      guestPhone: rsvp.phone,
      guestCount: rsvp.guestCount,
      status: rsvp.status,
      namedPeopleHtml: namedPeopleEmailList(partyPeople(rsvp)),
      dietaryBlockHtml: dietaryBlockHtml(rsvp),
      inviteUrl: partySiteUrl(),
    });
    const result = await sendGuestEmail({
      to: rsvp.email,
      subject: rendered.subject,
      html: rendered.html,
    });
    rsvp.confirmationSentAt = new Date().toISOString();
    await persistRsvp(rsvp);
    return NextResponse.json({ ok: true, result });
  }

  const existing = (await readRsvps(store.rsvps)).find((row) => row.id === body.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = existing;
  {
    if (body.status) {
      r.status = body.status as RsvpStatus;
      if (body.status === "confirmed") r.attend = "yes";
      if (body.status === "declined") r.attend = "no";
      if (body.status === "maybe") r.attend = "maybe";
      if (body.status !== "incomplete") {
        r.abandoned = false;
        r.formCompletedAt = r.formCompletedAt || new Date().toISOString();
      }
    }
    if (typeof body.firstName === "string") r.firstName = body.firstName.trim();
    if (typeof body.lastName === "string") r.lastName = body.lastName.trim();
    if (typeof body.fullName === "string") r.fullName = body.fullName.trim();
    if (typeof body.firstName === "string" || typeof body.lastName === "string") {
      const joined = `${r.firstName} ${r.lastName}`.trim();
      if (joined) r.fullName = joined;
    }
    if (typeof body.email === "string") r.email = body.email.trim();
    if (typeof body.phone === "string") r.phone = body.phone.trim();
    if (isAttendStatus(body.attend)) r.attend = body.attend;
    if (Array.isArray(body.companions)) {
      const parsed = parseDraftRsvp({ companions: body.companions, attend: r.attend });
      if (parsed.ok) r.companions = parsed.value.companions;
    }
    if (body.dietary === "yes" || body.dietary === "no" || body.dietary === "") {
      r.dietary = body.dietary;
    }
    if (typeof body.dietaryNotes === "string") r.dietaryNotes = body.dietaryNotes.trim();
    if (body.anythingElse === "yes" || body.anythingElse === "no" || body.anythingElse === "") {
      r.anythingElse = body.anythingElse;
    }
    if (typeof body.specialRequests === "string") r.specialRequests = body.specialRequests.trim();
    if (!Array.isArray(r.companions)) r.companions = [];
    const named = r.companions.filter(
      (person: PartyPerson) => person.firstName?.trim() && person.lastName?.trim(),
    );
    r.guestCount = headcountFor(r.attend, named);
    if (typeof body.guestCount === "number" && r.attend !== "no" && r.status !== "declined") {
      r.guestCount = Math.max(0, body.guestCount);
    }
    if (r.attend === "no" || r.status === "declined") {
      r.attend = "no";
      r.guestCount = 0;
    }
    r.updatedAt = new Date().toISOString();
  }
  await persistRsvp(r);
  const next = await readRsvps((await getStore()).rsvps);
  return NextResponse.json({ ok: true, rsvps: next, headcount: partyHeadcount(next) });
}

export async function POST(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const draft = parseDraftRsvp(body);
  if (!draft.ok) return NextResponse.json({ error: draft.error }, { status: 400 });
  const now = new Date().toISOString();
  const id = uid("rsvp");
  const parsed = draft.value;
  const fallbackName = String(body.fullName || "New Guest").trim();
  const [fallbackFirst, ...fallbackRest] = fallbackName.split(/\s+/);
  const attend = isAttendStatus(body.attend) ? body.attend : parsed?.attend || "yes";
  const companions = parsed?.companions.filter((person) => person.firstName && person.lastName) || [];
  await persistRsvp({
    id,
    firstName: parsed?.firstName || fallbackFirst || "New",
    lastName: parsed?.lastName || fallbackRest.join(" ") || "Guest",
    fullName: parsed?.fullName || fallbackName,
    attend,
    guestCount: headcountFor(attend, companions),
    companions,
    phone: parsed?.phone || "",
    email: parsed?.email || "",
    dietary: parsed?.dietary || "",
    dietaryNotes: parsed?.dietaryNotes || "",
    anythingElse: parsed?.anythingElse || "",
    specialRequests: parsed?.specialRequests || "",
    status: body.status || "pending",
    createdAt: now,
    updatedAt: now,
    formStartedAt: now,
    formCompletedAt: now,
    abandoned: false,
  });
  const listed = await readRsvps((await getStore()).rsvps);
  return NextResponse.json({ ok: true, id, rsvps: listed, headcount: partyHeadcount(listed) });
}
