import { promises as fs } from "fs";
import path from "path";
import {
  boothDbEnabled,
  storageDownload,
  storageRemove,
  storageSignedUrl,
  storageUpload,
} from "./supabase";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "booth");

export type BoothBucket = "booth-temp" | "booth-outputs" | "booth-throwbacks";

function localPath(bucket: BoothBucket, objectPath: string) {
  return path.join(LOCAL_ROOT, bucket, objectPath);
}

async function ensureParent(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function putObject(
  bucket: BoothBucket,
  objectPath: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ bucket: BoothBucket; path: string; backend: "supabase" | "local" }> {
  if (boothDbEnabled()) {
    await storageUpload(bucket, objectPath, bytes, contentType);
    return { bucket, path: objectPath, backend: "supabase" };
  }
  const dest = localPath(bucket, objectPath);
  await ensureParent(dest);
  await fs.writeFile(dest, bytes);
  return { bucket, path: objectPath, backend: "local" };
}

export async function getObject(bucket: BoothBucket, objectPath: string): Promise<Buffer> {
  if (boothDbEnabled()) {
    return storageDownload(bucket, objectPath);
  }
  return fs.readFile(localPath(bucket, objectPath));
}

export async function deleteObject(bucket: BoothBucket, objectPath: string): Promise<void> {
  if (boothDbEnabled()) {
    await storageRemove(bucket, objectPath);
    return;
  }
  try {
    await fs.unlink(localPath(bucket, objectPath));
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
    return storageSignedUrl(bucket, objectPath, expiresIn);
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
