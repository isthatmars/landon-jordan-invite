/**
 * Editable neon email suite for Ms. Kathy's Reminders tab.
 * Bodies live in the store so she can change the words; defaults seed the first load.
 */

import type { SiteContent } from "@/lib/types";
import {
  escapeHtml,
  namedPeopleEmailList,
  neonEmailTemplate,
  partySiteUrl,
} from "@/lib/notifications";

export type EditableEmailTemplateId =
  | "signup_confirm"
  | "signup_declined"
  | "party_30_days"
  | "what_to_bring"
  | "party_tomorrow"
  | "party_today"
  | "thank_you"
  | "owner_alert"
  | "abandoned_digest";

/** Fields Kathy can edit and save. */
export type EmailTemplateCopy = {
  subject: string;
  eyebrow: string;
  headline: string;
  /** Plain text; use {{placeholders}}. Newlines become line breaks in the email. */
  body: string;
  ctaLabel: string;
  /** Supports {{inviteUrl}} and {{uploadLink}} */
  ctaUrl: string;
  /** Thank-you email photo drop link — shown via {{uploadLink}} */
  uploadLink: string;
};

export type EmailTemplateMeta = {
  id: EditableEmailTemplateId;
  label: string;
  blurb: string;
  audience: string;
  /** Blast from Reminders to attending guests */
  sendable: boolean;
  /** Owner-only digest send */
  ownerDigest?: boolean;
  /** Sent automatically on RSVP complete */
  auto?: "rsvp_yes" | "rsvp_no" | "owner";
  howToSend?: string;
};

export type StoredEmailTemplates = Record<EditableEmailTemplateId, EmailTemplateCopy>;

export const EMAIL_TEMPLATE_META: EmailTemplateMeta[] = [
  {
    id: "signup_confirm",
    label: "Sign-up confirmation",
    blurb: "You're booked — sent automatically when a guest RSVPs yes.",
    audience: "Guest who just said yes",
    sendable: false,
    auto: "rsvp_yes",
    howToSend: "Goes out by itself when someone finishes RSVPing yes. Resend from the RSVPs tab.",
  },
  {
    id: "signup_declined",
    label: "We'll miss you",
    blurb: "A kind thank-you when someone says they can't make it.",
    audience: "Guest who declined",
    sendable: false,
    auto: "rsvp_no",
    howToSend: "Goes out by itself when someone declines.",
  },
  {
    id: "party_30_days",
    label: "Party in 30 days",
    blurb: "A flexible early reminder — date, place, and dress code.",
    audience: "Guests who are coming",
    sendable: true,
  },
  {
    id: "what_to_bring",
    label: "What to know / what to bring",
    blurb: "Parking, skates, kids, vibes — edit the checklist anytime.",
    audience: "Guests who are coming",
    sendable: true,
  },
  {
    id: "party_tomorrow",
    label: "Party is tomorrow!",
    blurb: "Last-night nudge so nobody forgets the time or address.",
    audience: "Guests who are coming",
    sendable: true,
  },
  {
    id: "party_today",
    label: "Party is today!",
    blurb: "Morning-of energy — see you on the floor tonight.",
    audience: "Guests who are coming",
    sendable: true,
  },
  {
    id: "thank_you",
    label: "Thank you for attending",
    blurb: "Day-after thank-you — remind folks to upload pictures.",
    audience: "Guests who came",
    sendable: true,
  },
  {
    id: "owner_alert",
    label: "New RSVP alert (for you)",
    blurb: "Ping to your inbox whenever someone finishes an RSVP.",
    audience: "You (host inbox)",
    sendable: false,
    auto: "owner",
    howToSend: "Arrives automatically when a guest finishes. You don't send this one.",
  },
  {
    id: "abandoned_digest",
    label: "Incomplete RSVPs (for you)",
    blurb: "People who started the form but didn't finish — emailed to you.",
    audience: "You (host inbox)",
    sendable: false,
    ownerDigest: true,
  },
];

const INVITE = "{{inviteUrl}}";

export const DEFAULT_EMAIL_TEMPLATES: StoredEmailTemplates = {
  signup_confirm: {
    subject: "You're booked for {{brandName}} 80s Party!",
    eyebrow: "RSVP confirmed",
    headline: "You're Booked!",
    body: `Hey {{guestName}} — you're booked for Landon & Jordan's {{partyTitle}}.

When & where:
{{eventDate}}
{{eventTime}}
{{eventVenue}}
{{eventAddress}}

Party size from you: {{guestCount}}
{{namedPeople}}

{{dietaryBlock}}

Dress code: {{dressCode}}

Every adult and child needs a first and last name on this invite. Lace up, dress 80s, and we'll see you on the floor!`,
    ctaLabel: "View Invite",
    ctaUrl: INVITE,
    uploadLink: "",
  },
  signup_declined: {
    subject: "RSVP received — {{brandName}} 80s Party",
    eyebrow: "Thanks for writing back",
    headline: "We'll Miss You",
    body: `Hey {{guestName}}, thank you for letting us know. We'll miss you at {{partyTitle}}.

{{eventDate}} · {{eventTime}}
{{eventVenue}}

This reply is marked as not coming. If plans change, you can update anytime from the invite.`,
    ctaLabel: "View Invite",
    ctaUrl: INVITE,
    uploadLink: "",
  },
  party_30_days: {
    subject: "30 days out — {{brandName}} 80s Party!",
    eyebrow: "Save the date energy",
    headline: "Party in 30 Days!",
    body: `Hey {{guestName}}!

Just a friendly heads-up — Landon & Jordan's 80s Birthday Party is about a month away.

{{eventDate}} · {{eventTime}}
{{eventVenue}}
{{eventAddress}}

Dress code: {{dressCode}}

Mark your calendar, dig out those neon kicks, and get ready to roll.`,
    ctaLabel: "Open Invite",
    ctaUrl: INVITE,
    uploadLink: "",
  },
  what_to_bring: {
    subject: "What to know & what to bring — {{brandName}}",
    eyebrow: "Party tips",
    headline: "What to Know / What to Bring",
    body: `Hey {{guestName}}!

A few handy notes for {{eventDate}} at {{eventVenue}}:

• Arrive ready to skate (or watch from the sidelines — both are perfect)
• Dinner buffet is included — tell us about dietary needs if you haven't
• Dress code: {{dressCode}} — flyest look wins a prize!
• Private party — invited guests only
• Address: {{eventAddress}}

[Edit this list anytime — parking tips, gift notes, kid info, etc.]

See you on the floor!`,
    ctaLabel: "Open Invite",
    ctaUrl: INVITE,
    uploadLink: "",
  },
  party_tomorrow: {
    subject: "Tomorrow's the night — {{brandName}}!",
    eyebrow: "One more sleep",
    headline: "Party Is Tomorrow!",
    body: `Hey {{guestName}}!

It's almost time — Landon & Jordan's 80s Birthday Party is TOMORROW.

{{eventDate}} · {{eventTime}}
{{eventVenue}}
{{eventAddress}}

Dress code: {{dressCode}}

Rest up, pick your fit, and we'll see you soon!`,
    ctaLabel: "Open Invite",
    ctaUrl: INVITE,
    uploadLink: "",
  },
  party_today: {
    subject: "It's TODAY — {{brandName}} 80s Party!",
    eyebrow: "Tonight's the night",
    headline: "Party Is Today!",
    body: `Hey {{guestName}}!

The day is HERE. Landon & Jordan can't wait to celebrate with you tonight.

{{eventTime}} at {{eventVenue}}
{{eventAddress}}

Dress code: {{dressCode}}

See you on the floor!`,
    ctaLabel: "Open Invite",
    ctaUrl: INVITE,
    uploadLink: "",
  },
  thank_you: {
    subject: "Thank you for celebrating with us!",
    eyebrow: "Day after vibes",
    headline: "Thank You for Coming!",
    body: `Hey {{guestName}}!

Thank you for helping make Landon & Jordan's 80s Birthday Party unforgettable. The music, the fits, the energy — you brought it.

Got pictures? Please upload them here so we can share the night:
{{uploadLink}}

Love,
The family`,
    ctaLabel: "Upload Pictures",
    ctaUrl: "{{uploadLink}}",
    uploadLink: "https://example.com/upload-party-photos",
  },
  owner_alert: {
    subject: "New RSVP: {{guestName}} · {{guestCount}} guests ({{status}})",
    eyebrow: "Owner alert",
    headline: "Someone's Coming!",
    body: `{{guestName}} just sent an RSVP.

{{guestEmail}}
{{guestPhone}}
{{status}} · headcount {{guestCount}}

Named people:
{{namedPeople}}

{{dietaryBlock}}

Finished replies land here. People who only started the form stay under In progress in admin.`,
    ctaLabel: "Open Admin",
    ctaUrl: "{{inviteUrl}}/admin",
    uploadLink: "",
  },
  abandoned_digest: {
    subject: "Incomplete RSVPs digest",
    eyebrow: "Follow-up list",
    headline: "Incomplete RSVPs",
    body: `Here are people who started the RSVP but didn't finish:

{{abandonedList}}

(Empty if nobody is mid-form right now.)`,
    ctaLabel: "Open Admin",
    ctaUrl: "{{inviteUrl}}/admin",
    uploadLink: "",
  },
};

export function emptyEmailTemplates(): StoredEmailTemplates {
  return structuredClone(DEFAULT_EMAIL_TEMPLATES);
}

export function mergeEmailTemplates(
  stored: Partial<StoredEmailTemplates> | null | undefined,
): StoredEmailTemplates {
  const base = emptyEmailTemplates();
  if (!stored) return base;
  for (const meta of EMAIL_TEMPLATE_META) {
    const row = stored[meta.id];
    if (!row) continue;
    base[meta.id] = {
      subject: typeof row.subject === "string" ? row.subject : base[meta.id].subject,
      eyebrow: typeof row.eyebrow === "string" ? row.eyebrow : base[meta.id].eyebrow,
      headline: typeof row.headline === "string" ? row.headline : base[meta.id].headline,
      body: typeof row.body === "string" ? row.body : base[meta.id].body,
      ctaLabel: typeof row.ctaLabel === "string" ? row.ctaLabel : base[meta.id].ctaLabel,
      ctaUrl: typeof row.ctaUrl === "string" ? row.ctaUrl : base[meta.id].ctaUrl,
      uploadLink:
        typeof row.uploadLink === "string" ? row.uploadLink : base[meta.id].uploadLink,
    };
  }
  return base;
}

export function getTemplateMeta(id: EditableEmailTemplateId): EmailTemplateMeta | undefined {
  return EMAIL_TEMPLATE_META.find((t) => t.id === id);
}

export type TemplateVars = {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCount?: number | string;
  status?: string;
  partyTitle?: string;
  namedPeopleHtml?: string;
  dietaryBlockHtml?: string;
  abandonedListHtml?: string;
  uploadLink?: string;
  inviteUrl?: string;
};

function fillPlain(template: string, map: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : `{{${key}}}`,
  );
}

/** Build neon HTML from editable copy + site facts + guest vars. */
export function renderEditableEmail(
  copy: EmailTemplateCopy,
  content: SiteContent,
  vars: TemplateVars = {},
): { subject: string; html: string; headline: string; eyebrow: string; bodyText: string } {
  const inviteUrl = vars.inviteUrl || partySiteUrl();
  const uploadLink = (vars.uploadLink ?? copy.uploadLink ?? "").trim() || inviteUrl;
  const partyTitle =
    vars.partyTitle ||
    `${content.heroScript} ${content.heroChrome} ${content.heroSubtitle}`.replace(/\s+/g, " ").trim();

  const plainMap: Record<string, string> = {
    guestName: vars.guestName || "Friend",
    guestEmail: vars.guestEmail || "",
    guestPhone: vars.guestPhone || "",
    guestCount: String(vars.guestCount ?? ""),
    status: vars.status || "",
    brandName: content.brandName,
    eventDate: content.eventDate,
    eventTime: content.eventTime,
    eventVenue: content.eventVenue,
    eventAddress: content.eventAddress,
    dressCode: content.dressCode,
    partyTitle,
    inviteUrl,
    uploadLink,
    // HTML slots stay as markers until after escape
    namedPeople: "%%NAMED_PEOPLE%%",
    dietaryBlock: "%%DIETARY%%",
    abandonedList: "%%ABANDONED%%",
  };

  const subject = fillPlain(copy.subject, plainMap);
  const eyebrow = fillPlain(copy.eyebrow, plainMap);
  const headline = fillPlain(copy.headline, plainMap);
  const ctaLabel = fillPlain(copy.ctaLabel, plainMap);
  const ctaUrl = fillPlain(copy.ctaUrl, plainMap);
  const bodyFilled = fillPlain(copy.body, plainMap);

  let bodyHtml = escapeHtml(bodyFilled).replace(/\n/g, "<br/>");
  bodyHtml = bodyHtml
    .replace(/%%NAMED_PEOPLE%%/g, vars.namedPeopleHtml || "")
    .replace(/%%DIETARY%%/g, vars.dietaryBlockHtml || "")
    .replace(/%%ABANDONED%%/g, vars.abandonedListHtml || "");

  const html = neonEmailTemplate({
    eyebrow: escapeHtml(eyebrow),
    headline: escapeHtml(headline),
    bodyHtml: `<div style="margin:0">${bodyHtml}</div>`,
    ctaLabel: ctaLabel || undefined,
    ctaUrl: ctaUrl || undefined,
  });

  return { subject, html, headline, eyebrow, bodyText: bodyFilled };
}

export function dietaryBlockHtml(opts: {
  dietary?: string;
  dietaryNotes?: string;
  anythingElse?: string;
  specialRequests?: string;
}): string {
  const parts: string[] = [];
  if (opts.dietary === "yes" && opts.dietaryNotes?.trim()) {
    parts.push(
      `<p style="margin:14px 0 0"><span style="color:#c6ff00;letter-spacing:0.12em;font-size:11px;text-transform:uppercase">Dietary</span><br/>${escapeHtml(opts.dietaryNotes)}</p>`,
    );
  } else if (opts.dietary === "no") {
    parts.push(`<p style="margin:14px 0 0;color:#c4b5d8">No dietary notes.</p>`);
  }
  if (opts.anythingElse === "yes" && opts.specialRequests?.trim()) {
    parts.push(
      `<p style="margin:10px 0 0"><span style="color:#c6ff00;letter-spacing:0.12em;font-size:11px;text-transform:uppercase">Note</span><br/>${escapeHtml(opts.specialRequests)}</p>`,
    );
  }
  return parts.join("");
}

export { namedPeopleEmailList };
