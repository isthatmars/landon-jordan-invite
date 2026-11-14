import { promises as fs } from "fs";
import path from "path";
import { uid } from "@/lib/id";
import { listRsvps, supabaseRsvpEnabled } from "@/lib/rsvp-db";
import { getStore } from "@/lib/store";
import { normalizeEmail } from "./crypto";
import { boothDbEnabled, rest } from "./supabase";
import type {
  BoothGenerationRecord,
  BoothGuest,
  BoothPhotoRecord,
  BoothSessionRecord,
  BoothTempUpload,
  RateLimitStatus,
} from "./types";
import { BOOTH_AI_LIMIT, BOOTH_AI_WINDOW_MS, BOOTH_ANON_IP_LIMIT } from "./types";

type LocalBoothStore = {
  sessions: BoothSessionRecord[];
  photos: BoothPhotoRecord[];
  generations: BoothGenerationRecord[];
  temps: BoothTempUpload[];
  rateEvents: { id: string; guestEmail: string | null; ipHash: string | null; kind: string; createdAt: string }[];
  otps: {
    id: string;
    email: string;
    firstName: string;
    codeHash: string;
    purpose: string;
    attempts: number;
    maxAttempts: number;
    expiresAt: string;
    consumedAt: string | null;
    createdAt: string;
  }[];
};

const LOCAL_PATH = path.join(process.cwd(), ".data", "booth-store.json");
let memory: LocalBoothStore | null = null;
let writeChain: Promise<void> = Promise.resolve();

function emptyStore(): LocalBoothStore {
  return { sessions: [], photos: [], generations: [], temps: [], rateEvents: [], otps: [] };
}

async function readLocal(): Promise<LocalBoothStore> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(LOCAL_PATH, "utf8");
    memory = { ...emptyStore(), ...(JSON.parse(raw) as LocalBoothStore) };
  } catch {
    memory = emptyStore();
  }
  return memory;
}

async function writeLocal(mutator: (s: LocalBoothStore) => void): Promise<LocalBoothStore> {
  return new Promise((resolve, reject) => {
    writeChain = writeChain
      .then(async () => {
        const current = await readLocal();
        const clone = structuredClone(current) as LocalBoothStore;
        mutator(clone);
        memory = clone;
        await fs.mkdir(path.dirname(LOCAL_PATH), { recursive: true });
        const tmp = `${LOCAL_PATH}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(clone, null, 2), "utf8");
        await fs.rename(tmp, LOCAL_PATH);
        resolve(clone);
      })
      .catch(reject);
  });
}

/* ---------- row mappers ---------- */

function photoFromRow(row: Record<string, unknown>): BoothPhotoRecord {
  return {
    id: String(row.id),
    kind: row.kind as BoothPhotoRecord["kind"],
    guestEmail: String(row.guest_email),
    guestFirstName: String(row.guest_first_name || ""),
    rsvpId: (row.rsvp_id as string) || null,
    status: row.status as BoothPhotoRecord["status"],
    consentAt: (row.consent_at as string) || null,
    sourcePath: (row.source_path as string) || null,
    rawPath: (row.raw_path as string) || null,
    brandedPath: (row.branded_path as string) || null,
    mime: String(row.mime || "image/jpeg"),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    errorMessage: (row.error_message as string) || null,
    submittedToGalleryAt: (row.submitted_to_gallery_at as string) || null,
    moderatedAt: (row.moderated_at as string) || null,
    moderatedBy: (row.moderated_by as string) || null,
    generationId: (row.generation_id as string) || null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function photoToRow(p: BoothPhotoRecord) {
  return {
    id: p.id,
    kind: p.kind,
    guest_email: p.guestEmail,
    guest_first_name: p.guestFirstName,
    rsvp_id: p.rsvpId,
    status: p.status,
    consent_at: p.consentAt,
    source_path: p.sourcePath,
    raw_path: p.rawPath,
    branded_path: p.brandedPath,
    mime: p.mime,
    width: p.width,
    height: p.height,
    error_message: p.errorMessage,
    submitted_to_gallery_at: p.submittedToGalleryAt,
    moderated_at: p.moderatedAt,
    moderated_by: p.moderatedBy,
    generation_id: p.generationId,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function genFromRow(row: Record<string, unknown>): BoothGenerationRecord {
  return {
    id: String(row.id),
    photoId: (row.photo_id as string) || null,
    guestEmail: String(row.guest_email),
    rsvpId: (row.rsvp_id as string) || null,
    ipHash: (row.ip_hash as string) || null,
    status: row.status as BoothGenerationRecord["status"],
    model: (row.model as string) || null,
    prompt: (row.prompt as string) || null,
    errorMessage: (row.error_message as string) || null,
    startedAt: (row.started_at as string) || null,
    finishedAt: (row.finished_at as string) || null,
    createdAt: String(row.created_at),
  };
}

function sessionFromRow(row: Record<string, unknown>): BoothSessionRecord {
  return {
    id: String(row.id),
    tokenHash: String(row.token_hash),
    email: String(row.email),
    firstName: String(row.first_name || ""),
    rsvpId: (row.rsvp_id as string) || null,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    lastSeenAt: String(row.last_seen_at),
  };
}

/* ---------- guests / RSVP match (no email existence leak to client) ---------- */

export async function findRsvpByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const store = await getStore();
  const list = supabaseRsvpEnabled() ? await listRsvps() : store.rsvps;
  return (
    list.find(
      (r) =>
        normalizeEmail(r.email) === normalized &&
        r.formCompletedAt &&
        !r.abandoned &&
        r.status !== "incomplete",
    ) || null
  );
}

export async function resolveGuestFromSession(session: BoothSessionRecord): Promise<BoothGuest> {
  const rsvp = session.rsvpId
    ? (await findRsvpByEmail(session.email))
    : await findRsvpByEmail(session.email);
  return {
    email: session.email,
    firstName: session.firstName || rsvp?.firstName || "",
    rsvpId: rsvp?.id || session.rsvpId,
    attend: rsvp?.attend || null,
    hasRsvp: Boolean(rsvp),
  };
}

/* ---------- OTP ---------- */

export async function createOtpChallenge(input: {
  email: string;
  firstName: string;
  codeHash: string;
  expiresAt: string;
}) {
  const id = uid("otp");
  const row = {
    id,
    email: normalizeEmail(input.email),
    firstName: input.firstName.trim(),
    codeHash: input.codeHash,
    purpose: "verify",
    attempts: 0,
    maxAttempts: 5,
    expiresAt: input.expiresAt,
    consumedAt: null as string | null,
    createdAt: new Date().toISOString(),
  };
  if (boothDbEnabled()) {
    await rest("booth_otp_challenges", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: row.id,
        email: row.email,
        first_name: row.firstName,
        code_hash: row.codeHash,
        purpose: row.purpose,
        attempts: 0,
        max_attempts: 5,
        expires_at: row.expiresAt,
      }),
    });
    return row;
  }
  await writeLocal((s) => {
    s.otps.unshift(row);
  });
  return row;
}

export async function getLatestOtp(email: string) {
  const normalized = normalizeEmail(email);
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_otp_challenges?email=eq.${encodeURIComponent(normalized)}&consumed_at=is.null&order=created_at.desc&limit=1`,
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
      id: String(row.id),
      email: String(row.email),
      firstName: String(row.first_name || ""),
      codeHash: String(row.code_hash),
      attempts: Number(row.attempts || 0),
      maxAttempts: Number(row.max_attempts || 5),
      expiresAt: String(row.expires_at),
      consumedAt: (row.consumed_at as string) || null,
    };
  }
  const s = await readLocal();
  return (
    s.otps.find((o) => o.email === normalized && !o.consumedAt) || null
  );
}

export async function bumpOtpAttempt(id: string, attempts: number, consume = false) {
  if (boothDbEnabled()) {
    await rest(`booth_otp_challenges?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        attempts,
        ...(consume ? { consumed_at: new Date().toISOString() } : {}),
      }),
    });
    return;
  }
  await writeLocal((s) => {
    const o = s.otps.find((x) => x.id === id);
    if (!o) return;
    o.attempts = attempts;
    if (consume) o.consumedAt = new Date().toISOString();
  });
}

/* ---------- sessions ---------- */

export async function saveSession(session: BoothSessionRecord) {
  if (boothDbEnabled()) {
    await rest("booth_sessions?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: session.id,
        token_hash: session.tokenHash,
        email: session.email,
        first_name: session.firstName,
        rsvp_id: session.rsvpId,
        expires_at: session.expiresAt,
        created_at: session.createdAt,
        last_seen_at: session.lastSeenAt,
      }),
    });
    return;
  }
  await writeLocal((s) => {
    const i = s.sessions.findIndex((x) => x.id === session.id);
    if (i >= 0) s.sessions[i] = session;
    else s.sessions.unshift(session);
  });
}

export async function findSessionByTokenHash(tokenHash: string): Promise<BoothSessionRecord | null> {
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_sessions?token_hash=eq.${encodeURIComponent(tokenHash)}&limit=1`,
    );
    return rows?.[0] ? sessionFromRow(rows[0]) : null;
  }
  const s = await readLocal();
  return s.sessions.find((x) => x.tokenHash === tokenHash) || null;
}

export async function touchSession(id: string) {
  const now = new Date().toISOString();
  if (boothDbEnabled()) {
    await rest(`booth_sessions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ last_seen_at: now }),
    });
    return;
  }
  await writeLocal((s) => {
    const row = s.sessions.find((x) => x.id === id);
    if (row) row.lastSeenAt = now;
  });
}

export async function deleteSession(id: string) {
  if (boothDbEnabled()) {
    await rest(`booth_sessions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    return;
  }
  await writeLocal((s) => {
    s.sessions = s.sessions.filter((x) => x.id !== id);
  });
}

/* ---------- photos ---------- */

export async function upsertPhoto(photo: BoothPhotoRecord) {
  if (boothDbEnabled()) {
    await rest("booth_photos?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(photoToRow(photo)),
    });
    return;
  }
  await writeLocal((s) => {
    const i = s.photos.findIndex((x) => x.id === photo.id);
    if (i >= 0) s.photos[i] = photo;
    else s.photos.unshift(photo);
  });
}

export async function getPhoto(id: string): Promise<BoothPhotoRecord | null> {
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_photos?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows?.[0] ? photoFromRow(rows[0]) : null;
  }
  const s = await readLocal();
  return s.photos.find((x) => x.id === id) || null;
}

export async function listPhotosForEmail(email: string): Promise<BoothPhotoRecord[]> {
  const normalized = normalizeEmail(email);
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_photos?guest_email=eq.${encodeURIComponent(normalized)}&order=created_at.desc`,
    );
    return (rows || []).map(photoFromRow);
  }
  const s = await readLocal();
  return s.photos.filter((p) => p.guestEmail === normalized);
}

export async function listPhotosAdmin(filters?: {
  status?: string;
  kind?: string;
  q?: string;
}): Promise<BoothPhotoRecord[]> {
  if (boothDbEnabled()) {
    const parts = ["booth_photos?select=*&order=created_at.desc"];
    if (filters?.status && filters.status !== "all") {
      parts[0] += `&status=eq.${encodeURIComponent(filters.status)}`;
    }
    if (filters?.kind && filters.kind !== "all") {
      parts[0] += `&kind=eq.${encodeURIComponent(filters.kind)}`;
    }
    if (filters?.q?.trim()) {
      const q = filters.q.trim();
      parts[0] += `&or=(guest_email.ilike.*${encodeURIComponent(q)}*,guest_first_name.ilike.*${encodeURIComponent(q)}*)`;
    }
    const rows = await rest<Record<string, unknown>[]>(parts[0]);
    return (rows || []).map(photoFromRow);
  }
  const s = await readLocal();
  let list = [...s.photos];
  if (filters?.status && filters.status !== "all") {
    list = list.filter((p) => p.status === filters.status);
  }
  if (filters?.kind && filters.kind !== "all") {
    list = list.filter((p) => p.kind === filters.kind);
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.guestEmail.includes(q) ||
        p.guestFirstName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listApprovedGallery(): Promise<BoothPhotoRecord[]> {
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      "booth_photos?status=eq.approved&order=moderated_at.desc",
    );
    return (rows || []).map(photoFromRow);
  }
  const s = await readLocal();
  return s.photos.filter((p) => p.status === "approved");
}

/* ---------- generations + rate limits ---------- */

export async function upsertGeneration(gen: BoothGenerationRecord) {
  if (boothDbEnabled()) {
    await rest("booth_generations?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: gen.id,
        photo_id: gen.photoId,
        guest_email: gen.guestEmail,
        rsvp_id: gen.rsvpId,
        ip_hash: gen.ipHash,
        status: gen.status,
        model: gen.model,
        prompt: gen.prompt,
        error_message: gen.errorMessage,
        started_at: gen.startedAt,
        finished_at: gen.finishedAt,
        created_at: gen.createdAt,
      }),
    });
    return;
  }
  await writeLocal((s) => {
    const i = s.generations.findIndex((x) => x.id === gen.id);
    if (i >= 0) s.generations[i] = gen;
    else s.generations.unshift(gen);
  });
}

export async function getGeneration(id: string): Promise<BoothGenerationRecord | null> {
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_generations?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    return rows?.[0] ? genFromRow(rows[0]) : null;
  }
  const s = await readLocal();
  return s.generations.find((x) => x.id === id) || null;
}

export async function recordRateEvent(guestEmail: string | null, ipHash: string | null, kind = "ai_gen") {
  const createdAt = new Date().toISOString();
  if (boothDbEnabled()) {
    await rest("booth_rate_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        guest_email: guestEmail,
        ip_hash: ipHash,
        kind,
        created_at: createdAt,
      }),
    });
    return;
  }
  await writeLocal((s) => {
    s.rateEvents.unshift({
      id: uid("rate"),
      guestEmail,
      ipHash,
      kind,
      createdAt,
    });
  });
}

export async function getRateLimitStatus(
  guestEmail: string | null,
  ipHash: string | null,
): Promise<RateLimitStatus> {
  const since = new Date(Date.now() - BOOTH_AI_WINDOW_MS).toISOString();
  let guestCount = 0;
  let ipCount = 0;
  let oldestGuest: string | null = null;

  if (boothDbEnabled()) {
    if (guestEmail) {
      const rows = await rest<{ created_at: string }[]>(
        `booth_rate_events?guest_email=eq.${encodeURIComponent(guestEmail)}&kind=eq.ai_gen&created_at=gte.${since}&order=created_at.asc&select=created_at`,
      );
      guestCount = rows?.length || 0;
      oldestGuest = rows?.[0]?.created_at || null;
    }
    if (ipHash) {
      const rows = await rest<{ created_at: string }[]>(
        `booth_rate_events?ip_hash=eq.${encodeURIComponent(ipHash)}&kind=eq.ai_gen&created_at=gte.${since}&select=created_at`,
      );
      ipCount = rows?.length || 0;
    }
  } else {
    const s = await readLocal();
    const recent = s.rateEvents.filter(
      (e) => e.kind === "ai_gen" && e.createdAt >= since,
    );
    const guestEvents = guestEmail
      ? recent.filter((e) => e.guestEmail === guestEmail).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      : [];
    guestCount = guestEvents.length;
    oldestGuest = guestEvents[0]?.createdAt || null;
    ipCount = ipHash ? recent.filter((e) => e.ipHash === ipHash).length : 0;
  }

  const guestRemaining = Math.max(0, BOOTH_AI_LIMIT - guestCount);
  const ipOk = ipCount < BOOTH_ANON_IP_LIMIT;
  const allowed = guestRemaining > 0 && ipOk;
  const resetAt =
    guestCount >= BOOTH_AI_LIMIT && oldestGuest
      ? new Date(new Date(oldestGuest).getTime() + BOOTH_AI_WINDOW_MS).toISOString()
      : null;

  return {
    remaining: guestRemaining,
    limit: BOOTH_AI_LIMIT,
    resetAt,
    allowed,
  };
}

/* ---------- temp uploads ---------- */

export async function saveTemp(temp: BoothTempUpload) {
  if (boothDbEnabled()) {
    await rest("booth_temp_uploads?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: temp.id,
        guest_email: temp.guestEmail,
        session_id: temp.sessionId,
        path: temp.path,
        mime: temp.mime,
        bytes: temp.bytes,
        purpose: temp.purpose,
        expires_at: temp.expiresAt,
        deleted_at: temp.deletedAt,
        created_at: temp.createdAt,
      }),
    });
    return;
  }
  await writeLocal((s) => {
    const i = s.temps.findIndex((x) => x.id === temp.id);
    if (i >= 0) s.temps[i] = temp;
    else s.temps.unshift(temp);
  });
}

export async function getTemp(id: string): Promise<BoothTempUpload | null> {
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_temp_uploads?id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const row = rows?.[0];
    if (!row) return null;
    return {
      id: String(row.id),
      guestEmail: (row.guest_email as string) || null,
      sessionId: (row.session_id as string) || null,
      path: String(row.path),
      mime: String(row.mime),
      bytes: Number(row.bytes || 0),
      purpose: row.purpose as BoothTempUpload["purpose"],
      expiresAt: String(row.expires_at),
      deletedAt: (row.deleted_at as string) || null,
      createdAt: String(row.created_at),
    };
  }
  const s = await readLocal();
  return s.temps.find((t) => t.id === id) || null;
}

export async function listExpiredTemps(nowIso = new Date().toISOString()): Promise<BoothTempUpload[]> {
  if (boothDbEnabled()) {
    const rows = await rest<Record<string, unknown>[]>(
      `booth_temp_uploads?deleted_at=is.null&expires_at=lte.${nowIso}&select=*`,
    );
    return (rows || []).map((row) => ({
      id: String(row.id),
      guestEmail: (row.guest_email as string) || null,
      sessionId: (row.session_id as string) || null,
      path: String(row.path),
      mime: String(row.mime),
      bytes: Number(row.bytes || 0),
      purpose: row.purpose as BoothTempUpload["purpose"],
      expiresAt: String(row.expires_at),
      deletedAt: (row.deleted_at as string) || null,
      createdAt: String(row.created_at),
    }));
  }
  const s = await readLocal();
  return s.temps.filter((t) => !t.deletedAt && t.expiresAt <= nowIso);
}

export async function markTempDeleted(id: string) {
  const now = new Date().toISOString();
  if (boothDbEnabled()) {
    await rest(`booth_temp_uploads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ deleted_at: now }),
    });
    return;
  }
  await writeLocal((s) => {
    const t = s.temps.find((x) => x.id === id);
    if (t) t.deletedAt = now;
  });
}
