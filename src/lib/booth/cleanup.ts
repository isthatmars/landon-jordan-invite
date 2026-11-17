import { listExpiredTemps, markTempDeleted } from "./db";
import { deleteObject, parseStoredRef } from "./storage";

/** Delete expired AI source uploads (≤30 min). Keeps AI outputs / throwbacks. */
export async function cleanupExpiredTempUploads(): Promise<{ deleted: number }> {
  const expired = await listExpiredTemps();
  let deleted = 0;
  for (const temp of expired) {
    const ref = parseStoredRef(temp.path) || {
      bucket: "booth-temp" as const,
      path: temp.path.replace(/^booth-temp:/, ""),
    };
    try {
      await deleteObject(ref.bucket, ref.path);
    } catch (err) {
      console.warn("[booth:cleanup]", temp.id, err);
    }
    await markTempDeleted(temp.id);
    deleted += 1;
  }
  return { deleted };
}
