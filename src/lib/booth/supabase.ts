/**
 * Shared Supabase REST + Storage helpers for the photo booth.
 * Uses the same service-role pattern as RSVP storage.
 */

export function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
    /\/$/,
    "",
  );
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return { url, key };
}

export function boothDbEnabled(): boolean {
  return supabaseConfig() !== null;
}

export async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const headers = new Headers(init.headers);
  headers.set("apikey", cfg.key);
  headers.set("Authorization", `Bearer ${cfg.key}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, { ...init, headers });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Supabase ${res.status}: ${detail.slice(0, 280)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function storageUpload(
  bucket: string,
  objectPath: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const res = await fetch(
    `${cfg.url}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Storage upload ${res.status}: ${detail.slice(0, 280)}`);
  }
}

export async function storageDownload(bucket: string, objectPath: string): Promise<Buffer> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const res = await fetch(`${cfg.url}/storage/v1/object/${bucket}/${objectPath}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Storage download ${res.status}: ${detail.slice(0, 280)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function storageRemove(bucket: string, objectPath: string): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;
  await fetch(`${cfg.url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [objectPath] }),
  }).catch(() => undefined);
}

export async function storageSignedUrl(
  bucket: string,
  objectPath: string,
  expiresIn = 3600,
): Promise<string> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const res = await fetch(`${cfg.url}/storage/v1/object/sign/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Signed URL ${res.status}: ${detail.slice(0, 280)}`);
  }
  const json = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const path = json.signedURL || json.signedUrl;
  if (!path) throw new Error("Signed URL missing from response.");
  if (path.startsWith("http")) return path;
  return `${cfg.url}/storage/v1${path.startsWith("/") ? "" : "/"}${path}`;
}
