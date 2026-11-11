import type { AttendStatus, PartyPerson, RsvpRecord, RsvpStatus } from "./types";

/**
 * RSVP storage in Supabase. Server-only.
 * Reads and writes use the service role, which bypasses RLS.
 * The anon key cannot see these tables.
 * When the URL or service role key is missing, callers keep the local file store.
 */

type DbRsvp = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  attend: AttendStatus;
  status: RsvpStatus;
  guest_count: number;
  dietary: RsvpRecord["dietary"];
  dietary_notes: string;
  anything_else: RsvpRecord["anythingElse"];
  special_requests: string;
  confirmation_sent_at: string | null;
  form_started_at: string | null;
  form_completed_at: string | null;
  last_field_touched: string | null;
  abandoned: boolean;
  created_at: string;
  updated_at: string;
  rsvp_people?: { first_name: string; last_name: string; age?: string | null; sort_order: number }[];
};

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
    /\/$/,
    "",
  );
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return { url, key };
}

export function supabaseRsvpEnabled(): boolean {
  return supabaseConfig() !== null;
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase RSVP storage is not configured.");
  const headers = new Headers(init.headers);
  headers.set("apikey", cfg.key);
  headers.set("Authorization", `Bearer ${cfg.key}`);
  headers.set("Content-Type", "application/json");
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, { ...init, headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Supabase ${res.status}: ${detail.slice(0, 280)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function recordToRow(record: RsvpRecord): DbRsvp {
  return {
    id: record.id,
    first_name: record.firstName,
    last_name: record.lastName,
    full_name: record.fullName,
    email: record.email,
    phone: record.phone,
    attend: record.attend,
    status: record.status,
    guest_count: record.guestCount,
    dietary: record.dietary,
    dietary_notes: record.dietaryNotes,
    anything_else: record.anythingElse,
    special_requests: record.specialRequests,
    confirmation_sent_at: record.confirmationSentAt || null,
    form_started_at: record.formStartedAt || null,
    form_completed_at: record.formCompletedAt || null,
    last_field_touched: record.lastFieldTouched || null,
    abandoned: Boolean(record.abandoned),
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export function rowToRecord(row: DbRsvp): RsvpRecord {
  const companions: PartyPerson[] = [...(row.rsvp_people || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((person) => ({
      firstName: person.first_name,
      lastName: person.last_name,
      age: person.age ? String(person.age) : "",
    }));
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    attend: row.attend,
    status: row.status,
    guestCount: row.guest_count,
    companions,
    dietary: row.dietary,
    dietaryNotes: row.dietary_notes,
    anythingElse: row.anything_else,
    specialRequests: row.special_requests,
    confirmationSentAt: row.confirmation_sent_at,
    formStartedAt: row.form_started_at,
    formCompletedAt: row.form_completed_at,
    lastFieldTouched: row.last_field_touched,
    abandoned: row.abandoned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRsvps(): Promise<RsvpRecord[]> {
  const rows = await rest<DbRsvp[]>(
    "rsvps?select=*,rsvp_people(first_name,last_name,age,sort_order)&order=updated_at.desc",
  );
  return (rows || []).map(rowToRecord);
}

export async function saveRsvp(record: RsvpRecord): Promise<void> {
  const row = recordToRow(record);
  await rest("rsvps?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  await rest(`rsvp_people?rsvp_id=eq.${encodeURIComponent(record.id)}`, { method: "DELETE" });
  if (record.companions.length === 0) return;
  await rest("rsvp_people", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(
      record.companions.map((person, index) => ({
        rsvp_id: record.id,
        first_name: person.firstName,
        last_name: person.lastName,
        age: person.age?.trim() || "",
        sort_order: index,
      })),
    ),
  });
}

/** Prefer Supabase when it is configured. Otherwise use the file-store list. */
export async function readRsvps(fallback: RsvpRecord[]): Promise<RsvpRecord[]> {
  if (!supabaseRsvpEnabled()) return fallback;
  return listRsvps();
}
