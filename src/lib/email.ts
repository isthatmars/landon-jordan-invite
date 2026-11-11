/**
 * Friendly names + previews for the emails this party already knows how to send.
 * Keep labels grandma-plain — Ms. Kathy picks from these in Reminders.
 */

import type { SiteContent } from "@/lib/types";

export type EmailTemplateId =
  | "party_reminder"
  | "abandoned_digest"
  | "still_invited"
  | "rsvp_confirmed"
  | "rsvp_declined"
  | "owner_alert"
  | "custom_update";

export type EmailTemplate = {
  id: EmailTemplateId;
  /** Short name she sees in the list */
  label: string;
  /** One warm sentence: what this email is for */
  blurb: string;
  /** Who usually receives it */
  audience: string;
  /** Subject line she can expect (with sample party facts filled in) */
  subjectExample: (content: SiteContent) => string;
  /** Plain preview of the message body (no HTML) */
  bodyPreview: (content: SiteContent) => string;
  /**
   * If set, Reminders can fire this with one click via /api/admin/reminders.
   * Others are preview-only or sent from another tab / automatically.
   */
  sendKind?: "party_reminder" | "abandoned_digest";
  /** Soft tip when she can't send from Reminders */
  howToSend?: string;
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "party_reminder",
    label: "Party reminder",
    blurb: "A warm nudge to guests who already said yes — date, time, place, and dress code.",
    audience: "Guests who are coming",
    subjectExample: (c) => `Reminder: ${c.eventDate} at ${c.eventVenue}`,
    bodyPreview: (c) =>
      `Hey [Guest name],\n\nQuick reminder — ${c.eventDate} · ${c.eventTime}\n${c.eventVenue}\n${c.eventAddress}\n\nDress code: ${c.dressCode}\n\nSee you on the floor!`,
    sendKind: "party_reminder",
  },
  {
    id: "abandoned_digest",
    label: "Incomplete RSVPs (for you)",
    blurb: "A short list of people who started the form but didn’t finish — emailed to you, the host.",
    audience: "You (Ms. Kathy / owner inbox)",
    subjectExample: () => "Incomplete RSVPs digest",
    bodyPreview: () =>
      "Incomplete RSVPs\n\n• [Name] — [email] — last field they touched\n• …\n\n(Empty if nobody is mid-form right now.)",
    sendKind: "abandoned_digest",
  },
  {
    id: "still_invited",
    label: "Friendly invite nudge",
    blurb: "A gentle “you’re still invited” note for one guest — great if someone needs a second copy.",
    audience: "One guest (from the RSVPs tab)",
    subjectExample: (c) => `Reminder — ${c.brandName} 80s Party`,
    bodyPreview: (c) =>
      `Hey [Guest name],\n\nJust a friendly nudge for ${c.eventDate} at ${c.eventVenue} (${c.eventTime}).\n${c.eventAddress}`,
    howToSend: "Open the RSVPs tab, find the guest, and tap “Resend email.”",
  },
  {
    id: "rsvp_confirmed",
    label: "You’re on the list!",
    blurb: "Sent automatically when someone finishes RSVPing “yes” — confirms who’s coming and the party details.",
    audience: "Guest who just said yes",
    subjectExample: (c) => `You're in — ${c.brandName} 80s Party`,
    bodyPreview: (c) =>
      `Hey [Guest name] — you're on the list for ${c.heroScript} ${c.heroChrome} ${c.heroSubtitle}.\n\nWhen & where:\n${c.eventDate}\n${c.eventTime}\n${c.eventVenue}\n${c.eventAddress}\n\nNamed people on their RSVP are listed here too.`,
    howToSend: "Goes out by itself when a guest finishes the form. No need to send this by hand.",
  },
  {
    id: "rsvp_declined",
    label: "We’ll miss you",
    blurb: "Sent automatically when someone says they can’t make it — a kind thank-you note.",
    audience: "Guest who said they can’t come",
    subjectExample: (c) => `RSVP received — ${c.brandName} 80s Party`,
    bodyPreview: (c) =>
      `Hey [Guest name], thank you for letting us know. We'll miss you at ${c.heroScript} ${c.heroChrome} ${c.heroSubtitle}.\n\n${c.eventDate} · ${c.eventTime}\n${c.eventVenue}`,
    howToSend: "Goes out by itself when someone declines. No need to send this by hand.",
  },
  {
    id: "owner_alert",
    label: "New RSVP alert (for you)",
    blurb: "A ping to your inbox whenever someone finishes an RSVP — who’s coming and the headcount.",
    audience: "You (host inbox)",
    subjectExample: () => "New RSVP: [Guest name] · [N] guests (confirmed)",
    bodyPreview: () =>
      "Someone just sent an RSVP.\n\n[Name]\n[email] · [phone]\nStatus · headcount\n\nNamed people and any notes are included.",
    howToSend: "Arrives automatically when a guest finishes. You don’t send this one.",
  },
  {
    id: "custom_update",
    label: "Custom party update",
    blurb: "Write your own message — parking tip, playlist tease, last-minute change — in your own words.",
    audience: "Whoever you choose (coming / everyone / checked guests)",
    subjectExample: () => "Party update",
    bodyPreview: () =>
      "Hey! Quick update about Landon & Jordan's 80s Birthday Party…\n\n(Write whatever you like in the Email tab.)",
    howToSend: "Use the Email tab to write it and choose who should get it.",
  },
];

export function getEmailTemplate(id: EmailTemplateId): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}
