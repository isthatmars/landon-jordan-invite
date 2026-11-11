import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth";
import { uid } from "@/lib/id";
import {
  dietaryBlockHtml,
  mergeEmailTemplates,
  namedPeopleEmailList,
  renderEditableEmail,
  type EditableEmailTemplateId,
} from "@/lib/email-templates";
import {
  escapeHtml,
  isResendConfigured,
  partySiteUrl,
  sendGuestEmail,
  sendOwnerEmail,
  type NotifyResult,
} from "@/lib/notifications";
import { partyPeople } from "@/lib/rsvp";
import { readRsvps } from "@/lib/rsvp-db";
import { getStore, updateStore } from "@/lib/store";
import type { ReminderLog } from "@/lib/types";

const BLAST_IDS: EditableEmailTemplateId[] = [
  "party_30_days",
  "what_to_bring",
  "party_tomorrow",
  "party_today",
  "thank_you",
];

function summarize(results: NotifyResult[]): ReminderLog["status"] {
  if (results.length === 0) return "failed";
  if (results.every((r) => r.stubbed)) return "stubbed";
  if (results.some((r) => !r.ok)) return "failed";
  return "sent";
}

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
    templates: mergeEmailTemplates(store.emailTemplates),
    emailLive: isResendConfigured(),
    hint: "Schedule via Vercel cron or Supabase Edge later. Trigger manually here for now.",
  });
}

export async function POST(request: Request) {
  if (!requireAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const rawKind = String(body.kind || body.templateId || "party_30_days");
  // Back-compat: older UI sent party_reminder
  const kind = (
    rawKind === "party_reminder" ? "party_30_days" : rawKind
  ) as EditableEmailTemplateId;

  const store = await getStore();
  const rsvps = await readRsvps(store.rsvps);
  const content = store.content;
  const templates = mergeEmailTemplates(store.emailTemplates);
  const now = new Date().toISOString();
  const inviteUrl = partySiteUrl();

  if (kind === "abandoned_digest") {
    const abandoned = rsvps.filter((r) => r.abandoned || r.status === "incomplete");
    const abandonedListHtml =
      abandoned.length === 0
        ? "<p>No abandoned forms right now.</p>"
        : `<ul>${abandoned
            .map(
              (r) =>
                `<li>${escapeHtml(r.fullName || "(no name)")} — ${escapeHtml(r.email || "no email")} — last: ${escapeHtml(r.lastFieldTouched || "?")}</li>`,
            )
            .join("")}</ul>`;
    const rendered = renderEditableEmail(templates.abandoned_digest, content, {
      abandonedListHtml,
      inviteUrl,
    });
    const owner = await sendOwnerEmail({
      subject: rendered.subject,
      html: rendered.html,
    });
    const log: ReminderLog = {
      id: uid("rem"),
      kind: "abandoned_digest",
      note: `Owner digest for ${abandoned.length} incomplete form(s) — ${owner.detail}`,
      status: owner.stubbed ? "stubbed" : owner.ok ? "sent" : "failed",
      createdAt: now,
    };
    await updateStore((s) => {
      s.reminders.unshift(log);
    });
    return NextResponse.json({ ok: owner.ok, reminder: log, abandoned });
  }

  if (!BLAST_IDS.includes(kind)) {
    return NextResponse.json(
      {
        error:
          "That template isn’t a blast send. Sign-up confirms go out automatically; owner alerts are automatic too.",
      },
      { status: 400 },
    );
  }

  const copy = templates[kind];
  const guests = rsvps.filter(
    (r) =>
      (r.status === "confirmed" || r.attend === "yes") &&
      !!r.email?.trim() &&
      !r.id.startsWith("sample-"),
  );

  const results: NotifyResult[] = [];
  for (const g of guests) {
    const rendered = renderEditableEmail(copy, content, {
      guestName: g.fullName || "Friend",
      guestEmail: g.email,
      guestPhone: g.phone,
      guestCount: g.guestCount,
      status: g.status,
      namedPeopleHtml: namedPeopleEmailList(partyPeople(g)),
      dietaryBlockHtml: dietaryBlockHtml(g),
      inviteUrl,
      uploadLink: copy.uploadLink,
    });
    results.push(
      await sendGuestEmail({
        to: g.email,
        subject: rendered.subject,
        html: rendered.html,
      }),
    );
  }

  const status = summarize(results);
  const log: ReminderLog = {
    id: uid("rem"),
    kind: kind as ReminderLog["kind"],
    note: `Template “${kind}” → ${guests.length} attending guest(s) [${status}]`,
    status,
    createdAt: now,
  };
  await updateStore((s) => {
    s.reminders.unshift(log);
  });
  return NextResponse.json({
    ok: status !== "failed",
    reminder: log,
    recipientCount: guests.length,
    emailLive: isResendConfigured(),
  });
}
