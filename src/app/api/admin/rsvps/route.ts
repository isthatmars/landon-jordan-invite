import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import {
  neonEmailTemplate,
  sendGuestEmail,
} from "@/lib/notifications";
import { getStore, updateStore } from "@/lib/store";
import type { RsvpStatus } from "@/lib/types";


export async function GET(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter");
  let rsvps = store.rsvps;
  if (filter === "incomplete" || filter === "abandoned") {
    rsvps = rsvps.filter((r) => r.abandoned || r.status === "incomplete");
  } else if (filter === "attending") {
    rsvps = rsvps.filter((r) => r.status === "confirmed" || r.attend === "yes");
  }
  return NextResponse.json({ rsvps });
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
    const rsvp = store.rsvps.find((r) => r.id === body.id);
    if (!rsvp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const result = await sendGuestEmail({
      to: rsvp.email,
      subject: `Reminder — ${content.brandName} 80s Party`,
      html: neonEmailTemplate({
        headline: "You're still invited!",
        bodyHtml: `<p>Hey ${rsvp.fullName},</p><p>Just a friendly nudge for <strong>${content.eventDate}</strong> at <strong>${content.eventVenue}</strong> (${content.eventTime}).</p>`,
        ctaLabel: "Open Invite",
        ctaUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      }),
    });
    await updateStore((s) => {
      const r = s.rsvps.find((x) => x.id === body.id);
      if (r) r.confirmationSentAt = new Date().toISOString();
    });
    return NextResponse.json({ ok: true, result });
  }

  await updateStore((s) => {
    const r = s.rsvps.find((x) => x.id === body.id);
    if (!r) return;
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
    if (typeof body.fullName === "string") r.fullName = body.fullName;
    if (typeof body.email === "string") r.email = body.email;
    if (typeof body.phone === "string") r.phone = body.phone;
    if (typeof body.guestCount === "number") r.guestCount = body.guestCount;
    r.updatedAt = new Date().toISOString();
  });

  return NextResponse.json({ ok: true, rsvps: (await getStore()).rsvps });
}

export async function POST(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();
  const id = uid("rsvp");
  await updateStore((s) => {
    s.rsvps.unshift({
      id,
      fullName: body.fullName || "New Guest",
      attend: body.attend || "yes",
      guestCount: Number(body.guestCount) || 1,
      phone: body.phone || "",
      email: body.email || "",
      specialRequests: "",
      status: body.status || "pending",
      createdAt: now,
      updatedAt: now,
      formStartedAt: now,
      formCompletedAt: now,
      abandoned: false,
    });
  });
  return NextResponse.json({ ok: true, id, rsvps: (await getStore()).rsvps });
}
