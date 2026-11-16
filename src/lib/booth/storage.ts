import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  boothDbEnabled,
  boothRequiresRemoteDb,
  storageDownload,
  storageRemove,
  storageSignedUrl,
  storageUpload,
} from "./supabase";

export type BoothBucket = "booth-temp" | "booth-outputs" | "booth-throwbacks";

/**
 * Prefer project `.data/booth`; on read-only hosts (Vercel) use `/tmp`.
 * Resolved lazily so the first successful mkdir wins.
 */
let resolvedLocalRoot: string | null = null;

async function localRoot(): Promise<string> {
  if (resolvedLocalRoot) return resolvedLocalRoot;
  const candidates = [
    path.join(process.cwd(), ".data", "booth"),
    path.join(os.tmpdir(), "lj-booth-storage"),
  ];
  for (const candidate of candidates) {
    try {
      await fs.mkdir(candidate, { recursive: true });
      const probe = path.join(candidate, ".write-probe");
      await fs.writeFile(probe, "ok");
      await fs.unlink(probe).catch(() => undefined);
      resolvedLocalRoot = candidate;
      return candidate;
    } catch (err) {
      console.warn("[booth:storage:local-root]", candidate, err);
    }
  }
  // Last resort — still point at tmp even if probe failed.
  resolvedLocalRoot = candidates[1];
  return resolvedLocalRoot;
}

async function localPath(bucket: BoothBucket, objectPath: string) {
  return path.join(await localRoot(), bucket, objectPath);
}

async function ensureParent(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function putLocal(
  bucket: BoothBucket,
  objectPath: string,
  bytes: Buffer,
): Promise<{ bucket: BoothBucket; path: string; backend: "local" }> {
  const dest = await localPath(bucket, objectPath);
  await ensureParent(dest);
  await fs.writeFile(dest, bytes);
  return { bucket, path: objectPath, backend: "local" };
}

export async function putObject(
  bucket: BoothBucket,
  objectPath: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ bucket: BoothBucket; path: string; backend: "supabase" | "local" }> {
  if (boothDbEnabled()) {
    try {
      await storageUpload(bucket, objectPath, bytes, contentType);
      return { bucket, path: objectPath, backend: "supabase" };
    } catch (err) {
      // On Vercel preview/prod never silently keep gallery bytes in ephemeral /tmp.
      if (boothRequiresRemoteDb()) {
        console.error("[booth:storage:upload-required]", err);
        throw err instanceof Error
          ? err
          : new Error("Supabase Storage upload failed for Photo Booth.");
      }
      console.warn("[booth:storage:upload-fallback]", err);
    }
  } else if (boothRequiresRemoteDb()) {
    throw new Error(
      "Photo Booth storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return putLocal(bucket, objectPath, bytes);
}

export async function getObject(bucket: BoothBucket, objectPath: string): Promise<Buffer> {
  if (boothDbEnabled()) {
    try {
      return await storageDownload(bucket, objectPath);
    } catch (err) {
      console.warn("[booth:storage:download-fallback]", err);
    }
  }
  return fs.readFile(await localPath(bucket, objectPath));
}

export async function deleteObject(bucket: BoothBucket, objectPath: string): Promise<void> {
  if (boothDbEnabled()) {
    try {
      await storageRemove(bucket, objectPath);
    } catch (err) {
      console.warn("[booth:storage:remove]", err);
    }
  }
  try {
    await fs.unlink(await localPath(bucket, objectPath));
  } catch {
    /* missing ok */
  }
}

/** Public-facing URL for the browser. Local mode serves via API proxy. */
export async function objectUrl(
  bucket: BoothBucket,
  objectPath: string,
  expiresIn = 3600,
): Promise<string> {
  if (boothDbEnabled()) {
    try {
      return await storageSignedUrl(bucket, objectPath, expiresIn);
    } catch (err) {
      console.warn("[booth:storage:signed-url-fallback]", err);
    }
  }
  return `/api/booth/file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(objectPath)}`;
}

export function parseStoredRef(ref: string | null | undefined): {
  bucket: BoothBucket;
  path: string;
} | null {
  if (!ref) return null;
  const m = ref.match(/^(booth-temp|booth-outputs|booth-throwbacks):(.+)$/);
  if (!m) return null;
  return { bucket: m[1] as BoothBucket, path: m[2] };
}

export function makeStoredRef(bucket: BoothBucket, objectPath: string): string {
  return `${bucket}:${objectPath}`;
}
