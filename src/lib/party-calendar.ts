/**
 * Party calendar helpers — Google Calendar URL + ICS payload from site content.
 * Absolute links go through partySiteUrl / NEXT_PUBLIC_SITE_URL.
 */

import { partySiteUrl } from "@/lib/notifications";
import type { SiteContent } from "@/lib/types";

/** Inline fallbacks — avoid importing defaults.ts (circular via email-templates). */
const FALLBACK = {
  brandName: "Landon & Jordan's",
  heroScript: "Landon & Jordan's",
  heroChrome: "80s",
  heroSubtitle: "BIRTHDAY PARTY",
  eventDate: "SATURDAY DEC 19, 2026",
  eventVenue: "XTREME ACTION PARK",
  eventAddress: "5300 POWERLINE RD, FORT LAUDERDALE, FL 33309",
  eventTime: "6:00 PM – MIDNIGHT",
  dressCode: "80s FRESH!",
} as const;

export type PartyCalendarFacts = {
  title: string;
  description: string;
  location: string;
  /** Local wall times in America/New_York */
  startLocal: Date;
  endLocal: Date;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bFl\b/g, "FL")
    .replace(/\bRd\b/g, "Rd");
}

/** Best-effort parse of content.eventDate like "SATURDAY DEC 19, 2026". */
export function parsePartyEventDate(raw: string): { year: number; month: number; day: number } | null {
  const cleaned = raw.trim();
  const m = cleaned.match(
    /(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (!m) {
    const alt = cleaned.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (!alt) return null;
    const month = MONTHS[alt[1].toLowerCase()];
    if (month == null) return null;
    return { year: Number(alt[3]), month, day: Number(alt[2]) };
  }
  const month = MONTHS[m[1].toLowerCase()];
  if (month == null) return null;
  return { year: Number(m[3]), month, day: Number(m[2]) };
}

/** Parse start hour from "6:00 PM – MIDNIGHT" (end defaults to midnight). */
export function parsePartyEventHours(raw: string): { startHour: number; startMinute: number; endHour: number; endMinute: number } {
  const text = raw.trim();
  const start = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  let startHour = 18;
  let startMinute = 0;
  if (start) {
    startHour = Number(start[1]) % 12;
    if (start[3].toLowerCase() === "pm") startHour += 12;
    startMinute = Number(start[2] || 0);
  }
  let endHour = 24;
  let endMinute = 0;
  if (/midnight/i.test(text)) {
    endHour = 24;
    endMinute = 0;
  } else {
    const times = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi)];
    if (times.length >= 2) {
      const end = times[1];
      endHour = Number(end[1]) % 12;
      if (end[3].toLowerCase() === "pm") endHour += 12;
      endMinute = Number(end[2] || 0);
    }
  }
  return { startHour, startMinute, endHour, endMinute };
}

function localPartsToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number {
  // America/New_York offset for mid-December is EST (UTC-5). Party is Dec 19.
  // Good enough for invite defaults; DST not in effect that week.
  const utc = Date.UTC(year, month, day, hour + 5, minute, 0);
  return utc;
}

export function resolvePartyCalendarFacts(
  content: Pick<
    SiteContent,
    "brandName" | "heroScript" | "heroChrome" | "heroSubtitle" | "eventDate" | "eventTime" | "eventVenue" | "eventAddress" | "dressCode"
  > = FALLBACK,
): PartyCalendarFacts {
  const parsed =
    parsePartyEventDate(content.eventDate) ||
    parsePartyEventDate(FALLBACK.eventDate) || {
      year: 2026,
      month: 11,
      day: 19,
    };
  const hours = parsePartyEventHours(content.eventTime || FALLBACK.eventTime);
  const startMs = localPartsToUtcMs(
    parsed.year,
    parsed.month,
    parsed.day,
    hours.startHour,
    hours.startMinute,
  );
  let endDay = parsed.day;
  let endMonth = parsed.month;
  let endYear = parsed.year;
  let endHour = hours.endHour;
  let endMinute = hours.endMinute;
  if (hours.endHour >= 24) {
    endHour = hours.endHour - 24;
    endMinute = hours.endMinute;
    const next = new Date(Date.UTC(parsed.year, parsed.month, parsed.day + 1));
    endYear = next.getUTCFullYear();
    endMonth = next.getUTCMonth();
    endDay = next.getUTCDate();
  }
  const endMs = localPartsToUtcMs(endYear, endMonth, endDay, endHour, endMinute);

  const title = `${content.brandName || FALLBACK.brandName} 80s Birthday Party`.replace(
    /\s+/g,
    " ",
  ).trim();
  const venue = titleCaseWords(content.eventVenue || FALLBACK.eventVenue);
  const address = titleCaseWords(content.eventAddress || FALLBACK.eventAddress);
  const location = `${venue}, ${address}`;
  const description = [
    `${content.heroScript || FALLBACK.heroScript} ${content.heroChrome || FALLBACK.heroChrome} ${content.heroSubtitle || FALLBACK.heroSubtitle}`
      .replace(/\s+/g, " ")
      .trim(),
    `When: ${content.eventDate || FALLBACK.eventDate} · ${content.eventTime || FALLBACK.eventTime}`,
    `Dress code: ${content.dressCode || FALLBACK.dressCode}`,
    `Invite: ${partySiteUrl()}`,
  ].join("\n");

  return {
    title,
    description,
    location,
    startLocal: new Date(startMs),
    endLocal: new Date(endMs),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC stamp YYYYMMDDTHHMMSSZ */
export function formatGoogleUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** Floating local stamp for ICS with TZID=America/New_York */
export function formatNyLocalStamp(utcInstant: Date): string {
  // Convert UTC instant back to America/New_York wall time (EST = UTC-5 for Dec).
  const local = new Date(utcInstant.getTime() - 5 * 60 * 60 * 1000);
  return (
    `${local.getUTCFullYear()}${pad2(local.getUTCMonth() + 1)}${pad2(local.getUTCDate())}` +
    `T${pad2(local.getUTCHours())}${pad2(local.getUTCMinutes())}${pad2(local.getUTCSeconds())}`
  );
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildPartyGoogleCalendarUrl(
  content?: Parameters<typeof resolvePartyCalendarFacts>[0],
): string {
  const facts = resolvePartyCalendarFacts(content);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: facts.title,
    dates: `${formatGoogleUtcStamp(facts.startLocal)}/${formatGoogleUtcStamp(facts.endLocal)}`,
    details: facts.description,
    location: facts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildPartyIcs(content?: Parameters<typeof resolvePartyCalendarFacts>[0]): string {
  const facts = resolvePartyCalendarFacts(content);
  const now = formatGoogleUtcStamp(new Date());
  const site = partySiteUrl();
  const uid = `landon-jordan-80s-party-${formatNyLocalStamp(facts.startLocal)}@landonandjordan.com`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Landon & Jordan//80s Birthday Party//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=America/New_York:${formatNyLocalStamp(facts.startLocal)}`,
    `DTEND;TZID=America/New_York:${formatNyLocalStamp(facts.endLocal)}`,
    `SUMMARY:${icsEscape(facts.title)}`,
    `DESCRIPTION:${icsEscape(facts.description)}`,
    `LOCATION:${icsEscape(facts.location)}`,
    `URL:${site}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Public absolute ICS download URL for email CTAs. */
export function partyIcsUrl(): string {
  return `${partySiteUrl()}/api/calendar.ics`;
}

export function partyGoogleCalendarUrl(
  content?: Parameters<typeof resolvePartyCalendarFacts>[0],
): string {
  return buildPartyGoogleCalendarUrl(content);
}
