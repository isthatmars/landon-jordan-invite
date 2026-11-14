/**
 * OpenArt client for Photo Booth generations.
 *
 * Primary path: HTTPS OpenArt CLI API with server-only `OPENART_TOKEN`.
 * Optional local fallback: spawn `openart` CLI when the binary is available
 * (dev / agent hosts). Never expose the token to the browser.
 */

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PHOTO_BOOTH_OPENART_MODE,
  PHOTO_BOOTH_OPENART_MODEL,
  PHOTO_BOOTH_TRANSFORM_PROMPT,
} from "@/lib/photoBooth";

const DEFAULT_API_BASE = "https://openart.ai";

export type OpenArtGenerateResult = {
  historyId: string;
  imageUrl: string;
  model: string;
  mode: typeof PHOTO_BOOTH_OPENART_MODE;
};

function apiBase() {
  return (process.env.OPENART_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
}

function openArtToken() {
  return process.env.OPENART_TOKEN?.trim() || "";
}

function authHeaders(): HeadersInit {
  const token = openArtToken();
  if (!token) {
    throw new OpenArtError(
      "OPENART_TOKEN is not configured (server secret required).",
      "missing_token",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-openart-cli-version": "photo-booth",
  };
}

export class OpenArtError extends Error {
  code: "missing_token" | "bad_request" | "openart" | "timeout";
  constructor(
    message: string,
    code: OpenArtError["code"] = "openart",
  ) {
    super(message);
    this.name = "OpenArtError";
    this.code = code;
  }
}

function parseDataUrl(input: string): { mime: string; bytes: Buffer } {
  const trimmed = input.trim();
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(trimmed);
  if (match) {
    return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
  }
  // Raw base64 — assume jpeg unless caller overrides via mime elsewhere.
  return { mime: "image/jpeg", bytes: Buffer.from(trimmed, "base64") };
}

function extForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

type SignResponse = {
  signURL?: string;
  signUrl?: string;
  accessURL?: string;
  accessUrl?: string;
  uploadId?: string;
  uploadID?: string;
  url?: string;
};

async function signUpload(opts: {
  filename: string;
  size: number;
  contentType: string;
}): Promise<{ signURL: string; accessURL: string; uploadId: string }> {
  const res = await fetch(`${apiBase()}/api/upload/sign`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      filename: opts.filename,
      size: opts.size,
      contentType: opts.contentType,
      resourceType: "image",
      businessType: "create-image",
      needThumbnail: false,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as SignResponse & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new OpenArtError(
      json.error || json.message || `OpenArt upload sign failed (${res.status})`,
    );
  }
  const signURL = json.signURL || json.signUrl || "";
  const accessURL = json.accessURL || json.accessUrl || json.url || "";
  const uploadId = json.uploadId || json.uploadID || accessURL;
  if (!signURL || !accessURL) {
    throw new OpenArtError("OpenArt upload sign returned no URLs.");
  }
  return { signURL, accessURL, uploadId };
}

async function putSigned(signURL: string, bytes: Buffer, contentType: string) {
  const res = await fetch(signURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) {
    throw new OpenArtError(`OpenArt upload PUT failed (${res.status})`);
  }
}

async function waitUploadReady(accessURL: string, uploadId: string) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${apiBase()}/api/upload/metadata`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        mediaUrl: accessURL,
        mediaType: "image",
        uploadId,
        label: "photo-booth-capture",
      }),
    });
    if (res.ok) return;
    await sleep(800);
  }
  // Soft-continue — generation may still accept a fresh CDN URL.
}

type GenerateSubmit = {
  historyId?: string;
  id?: string;
  resourceIds?: string[];
};

async function submitImage2Image(opts: {
  prompt: string;
  model: string;
  imageUrl: string;
  label: string;
}): Promise<string> {
  const res = await fetch(`${apiBase()}/api/cli/v1/generate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: opts.model,
      media: "image",
      mode: PHOTO_BOOTH_OPENART_MODE,
      params: {
        prompt: opts.prompt,
        imageCount: 1,
        aspectRatio: "1:1",
        resolution: "1K",
        visualReferences: [
          {
            type: "image",
            id: opts.imageUrl,
            label: opts.label,
            url: opts.imageUrl,
          },
        ],
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as GenerateSubmit & {
    error?: string;
    message?: string;
    data?: GenerateSubmit;
  };
  if (!res.ok) {
    throw new OpenArtError(
      json.error || json.message || `OpenArt generate failed (${res.status})`,
    );
  }
  const historyId =
    json.historyId ||
    json.id ||
    json.data?.historyId ||
    json.data?.id ||
    "";
  if (!historyId) {
    throw new OpenArtError("OpenArt generate returned no historyId.");
  }
  return historyId;
}

type CreationPayload = {
  status?: string;
  state?: string;
  url?: string;
  imageUrl?: string;
  resultUrl?: string;
  resources?: Array<{ url?: string; imageUrl?: string; status?: string }>;
  results?: Array<{ url?: string }>;
  data?: CreationPayload;
  error?: string;
  message?: string;
};

function pickImageUrl(payload: CreationPayload): string | null {
  const root = payload.data || payload;
  const direct =
    root.url || root.imageUrl || root.resultUrl || root.results?.[0]?.url;
  if (direct) return direct;
  for (const r of root.resources || []) {
    if (r.url || r.imageUrl) return (r.url || r.imageUrl)!;
  }
  return null;
}

function creationStatus(payload: CreationPayload): string {
  const root = payload.data || payload;
  return (root.status || root.state || "").toUpperCase();
}

async function pollCreation(historyId: string, timeoutMs = 120_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const paths = [
    `/api/creations/${encodeURIComponent(historyId)}`,
    `/api/cli/v1/creations/${encodeURIComponent(historyId)}`,
    `/api/history/${encodeURIComponent(historyId)}`,
  ];
  let lastErr = "OpenArt creation still running.";
  while (Date.now() < deadline) {
    for (const path of paths) {
      const res = await fetch(`${apiBase()}${path}`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (res.status === 404) continue;
      const json = (await res.json().catch(() => ({}))) as CreationPayload;
      if (!res.ok) {
        lastErr = json.error || json.message || `poll ${res.status}`;
        continue;
      }
      const status = creationStatus(json);
      if (
        status === "FAILED" ||
        status === "CANCELLED" ||
        status === "CANCELED" ||
        status === "ERROR"
      ) {
        throw new OpenArtError(json.error || json.message || `OpenArt ${status}`);
      }
      const url = pickImageUrl(json);
      if (url && (status === "COMPLETED" || status === "SUCCESS" || status === "DONE" || !status)) {
        return url;
      }
      if (url && (status === "COMPLETED" || !status || status.includes("COMPLETE"))) {
        return url;
      }
    }
    await sleep(1500);
  }
  throw new OpenArtError(lastErr || "OpenArt generation timed out.", "timeout");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** HTTP path: sign → PUT → generate image2image → poll. */
export async function generatePhotoBoothViaHttp(opts: {
  imageBase64: string;
  mimeType?: string;
  prompt?: string;
  model?: string;
}): Promise<OpenArtGenerateResult> {
  const parsed = parseDataUrl(
    opts.mimeType && !opts.imageBase64.startsWith("data:")
      ? `data:${opts.mimeType};base64,${opts.imageBase64}`
      : opts.imageBase64,
  );
  const mime = opts.mimeType || parsed.mime;
  const filename = `booth-capture.${extForMime(mime)}`;
  const model = opts.model || PHOTO_BOOTH_OPENART_MODEL;
  const prompt = opts.prompt || PHOTO_BOOTH_TRANSFORM_PROMPT;

  const signed = await signUpload({
    filename,
    size: parsed.bytes.length,
    contentType: mime,
  });
  await putSigned(signed.signURL, parsed.bytes, mime);
  await waitUploadReady(signed.accessURL, signed.uploadId);

  const historyId = await submitImage2Image({
    prompt,
    model,
    imageUrl: signed.accessURL,
    label: "guest-capture",
  });
  const imageUrl = await pollCreation(historyId);
  return { historyId, imageUrl, model, mode: PHOTO_BOOTH_OPENART_MODE };
}

/** Local/agent fallback: OpenArt CLI with OPENART_TOKEN in the environment. */
export async function generatePhotoBoothViaCli(opts: {
  imageBase64: string;
  mimeType?: string;
  prompt?: string;
  model?: string;
}): Promise<OpenArtGenerateResult> {
  const token = openArtToken();
  if (!token) {
    throw new OpenArtError(
      "OPENART_TOKEN is not configured (server secret required).",
      "missing_token",
    );
  }
  const parsed = parseDataUrl(
    opts.mimeType && !opts.imageBase64.startsWith("data:")
      ? `data:${opts.mimeType};base64,${opts.imageBase64}`
      : opts.imageBase64,
  );
  const model = opts.model || PHOTO_BOOTH_OPENART_MODEL;
  const prompt = opts.prompt || PHOTO_BOOTH_TRANSFORM_PROMPT;
  const dir = await mkdtemp(join(tmpdir(), "photo-booth-"));
  const input = join(dir, `capture.${extForMime(parsed.mime)}`);
  const outDir = join(dir, "out");
  try {
    await writeFile(input, parsed.bytes);
    await writeFile(join(dir, ".keep"), "");
    const { stdout, stderr, code } = await runCli(
      [
        "generate",
        "image",
        prompt,
        "--model",
        model,
        "--image",
        input,
        "-o",
        outDir,
        "--json",
        "--no-input",
        "--yes",
      ],
      { OPENART_TOKEN: token, OPENART_API_BASE: apiBase() },
      180_000,
    );
    if (code !== 0) {
      throw new OpenArtError(stderr || stdout || `openart CLI exited ${code}`);
    }
    let parsedJson: Record<string, unknown> = {};
    try {
      parsedJson = JSON.parse(stdout) as Record<string, unknown>;
    } catch {
      /* CLI may print path lines — fall through to filesystem */
    }
    const historyId = String(
      parsedJson.historyId || parsedJson.id || parsedJson.creationId || "cli",
    );
    let imageUrl = String(
      parsedJson.url ||
        parsedJson.imageUrl ||
        parsedJson.resultUrl ||
        (Array.isArray(parsedJson.urls) ? parsedJson.urls[0] : "") ||
        "",
    );
    if (!imageUrl) {
      const { readdir } = await import("node:fs/promises");
      const files = await readdir(outDir).catch(() => [] as string[]);
      const first = files.find((f) => /\.(png|jpe?g|webp)$/i.test(f));
      if (first) {
        const buf = await readFile(join(outDir, first));
        imageUrl = `data:image/png;base64,${buf.toString("base64")}`;
      }
    }
    if (!imageUrl) {
      throw new OpenArtError(stderr || "OpenArt CLI returned no image URL.");
    }
    return { historyId, imageUrl, model, mode: PHOTO_BOOTH_OPENART_MODE };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runCli(
  args: string[],
  env: Record<string, string>,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn("openart", args, {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr.on("data", (c) => {
      stderr += String(c);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr || String(err), code: 1 });
    });
  });
}

/**
 * Preferred entry: HTTP when token is set; CLI fallback if `openart` works
 * (useful on agent VMs). Always OpenArt — never a third-party image host.
 */
export async function generatePhotoBoothImage(opts: {
  imageBase64: string;
  mimeType?: string;
  prompt?: string;
  model?: string;
}): Promise<OpenArtGenerateResult> {
  if (!openArtToken()) {
    throw new OpenArtError(
      "OPENART_TOKEN is not configured (server secret required).",
      "missing_token",
    );
  }
  try {
    return await generatePhotoBoothViaHttp(opts);
  } catch (httpErr) {
    // CLI fallback for local/agent hosts that have the binary + token.
    try {
      return await generatePhotoBoothViaCli(opts);
    } catch {
      throw httpErr;
    }
  }
}

export function openArtConfigured() {
  return Boolean(openArtToken());
}
