import type { AttendStatus, PartyPerson, RsvpRecord } from "./types";

/** Additional named people on one form. The submitter is counted separately. */
export const MAX_COMPANIONS = 15;

const NAME_MAX = 80;
const EMAIL_MAX = 200;
const PHONE_MAX = 40;
const NOTES_MAX = 2000;

export type YesNo = "yes" | "no";

export interface CompletedRsvp {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  attend: AttendStatus;
  companions: PartyPerson[];
  /** Named people coming: 1 + companions when yes/maybe, otherwise 0. */
  guestCount: number;
  dietary: YesNo;
  dietaryNotes: string;
  anythingElse: YesNo;
  specialRequests: string;
}

export interface DraftRsvp {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  attend: AttendStatus;
  companions: PartyPerson[];
  guestCount: number;
  dietary: YesNo | "";
  dietaryNotes: string;
  anythingElse: YesNo | "";
  specialRequests: string;
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export function isAttendStatus(value: unknown): value is AttendStatus {
  return value === "yes" || value === "no" || value === "maybe";
}

export function isComing(attend: AttendStatus): boolean {
  return attend === "yes" || attend === "maybe";
}

export function fullNameOf(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().replace(/\s+/g, " ");
}

/** Door-list size. Decline is always 0, even if companion rows were filled in. */
export function headcountFor(attend: AttendStatus, companions: PartyPerson[]): number {
  if (!isComing(attend)) return 0;
  return 1 + companions.length;
}

const AGE_MAX = 40;

function readCompanions(
  input: unknown,
  strict: boolean,
): ParseResult<PartyPerson[]> {
  if (input == null || input === "") return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, error: "Additional guests need to be a list of names." };
  }
  if (input.length > MAX_COMPANIONS) {
    return {
      ok: false,
      error: `You can register up to ${MAX_COMPANIONS} other people on this form.`,
    };
  }
  const companions: PartyPerson[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      if (strict) {
        return { ok: false, error: "Every adult and child needs a first and last name." };
      }
      continue;
    }
    const row = raw as { firstName?: unknown; lastName?: unknown; age?: unknown };
    const firstName = clip(row.firstName, NAME_MAX);
    const lastName = clip(row.lastName, NAME_MAX);
    const age = clip(row.age, AGE_MAX);
    if (!firstName && !lastName && !age) continue;
    if (!firstName || !lastName) {
      if (strict) {
        return { ok: false, error: "Every adult and child needs a first and last name." };
      }
      companions.push({ firstName, lastName, age });
      continue;
    }
    companions.push({ firstName, lastName, age });
  }
  return { ok: true, value: companions };
}

function readYesNo(value: unknown): YesNo | "" {
  return value === "yes" || value === "no" ? value : "";
}

function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function phoneDigits(phone: string): number {
  return phone.replace(/\D/g, "").length;
}

export function parseCompletedRsvp(body: unknown): ParseResult<CompletedRsvp> {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const firstName = clip(source.firstName, NAME_MAX);
  const lastName = clip(source.lastName, NAME_MAX);
  const email = clip(source.email, EMAIL_MAX);
  const phone = clip(source.phone, PHONE_MAX);
  const dietaryNotes = clip(source.dietaryNotes, NOTES_MAX);
  const specialRequests = clip(source.specialRequests, NOTES_MAX);
  const dietary = readYesNo(source.dietary);
  const anythingElse = readYesNo(source.anythingElse);

  if (!firstName) return { ok: false, error: "What's your first name?" };
  if (!lastName) return { ok: false, error: "What's your last name?" };
  if (!isAttendStatus(source.attend)) {
    return { ok: false, error: "Let us know if you are able to attend." };
  }

  const attend = source.attend;
  const coming = isComing(attend);
  if (coming) {
    if (!email) return { ok: false, error: "Add an email address so we can confirm your RSVP." };
    if (!looksLikeEmail(email)) return { ok: false, error: "That email doesn't look quite right." };
    if (!phone) {
      return { ok: false, error: "Add a phone number so we can reach you about the party." };
    }
    if (phoneDigits(phone) < 7) {
      return { ok: false, error: "Enter a full phone number." };
    }
  } else if (email && !looksLikeEmail(email)) {
    return { ok: false, error: "That email doesn't look quite right." };
  }

  const companions = readCompanions(source.companions, true);
  if (!companions.ok) return companions;
  const people = attend === "no" ? [] : companions.value;
  if (!dietary) {
    return {
      ok: false,
      error: "Let us know if anyone has dietary restrictions or food allergies.",
    };
  }
  if (dietary === "yes" && !dietaryNotes) {
    return { ok: false, error: "Tell us the dietary restrictions so we can get more food." };
  }
  if (!anythingElse) {
    return { ok: false, error: "Let us know if there's anything else." };
  }
  if (anythingElse === "yes" && !specialRequests) {
    return { ok: false, error: "Add a note so we know what else to plan for." };
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      fullName: fullNameOf(firstName, lastName),
      email,
      phone: attend === "no" ? "" : phone,
      attend,
      companions: people,
      guestCount: headcountFor(attend, people),
      dietary,
      dietaryNotes: dietary === "yes" ? dietaryNotes : dietaryNotes,
      anythingElse,
      specialRequests,
    },
  };
}

/** Best-effort snapshot for abandoned-form tracking. Does not enforce required answers. */
export function parseDraftRsvp(body: unknown): ParseResult<DraftRsvp> {
  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const firstName = clip(source.firstName, NAME_MAX);
  const lastName = clip(source.lastName, NAME_MAX);
  const companions = readCompanions(source.companions, false);
  if (!companions.ok) return companions;
  const attend = isAttendStatus(source.attend) ? source.attend : "yes";
  const named = companions.value.filter((person) => person.firstName && person.lastName);
  return {
    ok: true,
    value: {
      firstName,
      lastName,
      fullName: fullNameOf(firstName, lastName),
      email: clip(source.email, EMAIL_MAX),
      phone: clip(source.phone, PHONE_MAX),
      attend,
      companions: companions.value,
      guestCount: headcountFor(attend, named),
      dietary: readYesNo(source.dietary),
      dietaryNotes: clip(source.dietaryNotes, NOTES_MAX),
      anythingElse: readYesNo(source.anythingElse),
      specialRequests: clip(source.specialRequests, NOTES_MAX),
    },
  };
}

export function isSampleRsvp(id: string): boolean {
  return id.startsWith("sample-");
}

/** Completed, not declined, and not a bundled sample row. */
export function countsTowardHeadcount(rsvp: RsvpRecord): boolean {
  if (isSampleRsvp(rsvp.id)) return false;
  if (rsvp.abandoned) return false;
  if (!rsvp.formCompletedAt) return false;
  if (rsvp.status === "incomplete" || rsvp.status === "declined") return false;
  if (rsvp.attend === "no") return false;
  return true;
}

/** Sum guestCount for completed non-declined RSVPs, excluding sample-* ids. */
export function partyHeadcount(rsvps: RsvpRecord[]): number {
  return rsvps.reduce((sum, rsvp) => {
    if (!countsTowardHeadcount(rsvp)) return sum;
    const count = Number(rsvp.guestCount);
    return sum + (Number.isFinite(count) ? Math.max(0, count) : 0);
  }, 0);
}
