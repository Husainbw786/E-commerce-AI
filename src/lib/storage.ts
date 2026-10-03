import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put, del } from "@vercel/blob";
import { env } from "@/lib/env";

/**
 * Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 * Otherwise (local dev) files go to .data/files and are served by /api/files/*.
 */
const LOCAL_ROOT = path.join(process.cwd(), ".data", "files");
const LOCAL_PREFIX = "/api/files/";

function shouldUseBlob() {
  if (env().BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is not set. Add Vercel Blob to the project.");
  return false;
}

export async function saveFile(folder: string, ext: string, body: Buffer, contentType: string): Promise<string> {
  const name = `${folder}/${randomUUID()}.${ext}`;
  if (shouldUseBlob()) {
    const blob = await put(name, body, { access: "public", contentType, addRandomSuffix: false });
    return blob.url;
  }
  const full = path.join(LOCAL_ROOT, name);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return LOCAL_PREFIX + name;
}

export function localPathFor(relative: string): string | null {
  const full = path.normalize(path.join(LOCAL_ROOT, relative));
  return full.startsWith(LOCAL_ROOT + path.sep) ? full : null;
}

function isOurBlobUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** Read a file we stored earlier. Only accepts our own URLs (no SSRF). */
export async function readStoredFile(url: string): Promise<Buffer> {
  if (url.startsWith(LOCAL_PREFIX)) {
    const full = localPathFor(url.slice(LOCAL_PREFIX.length));
    if (!full) throw new Error("Bad file path");
    return readFile(full);
  }
  if (!isOurBlobUrl(url)) throw new Error("Unknown file location");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not read stored file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export function isStoredUrl(url: string) {
  return url.startsWith(LOCAL_PREFIX) || isOurBlobUrl(url);
}

export async function deleteFiles(urls: string[]) {
  const blobUrls = urls.filter(isOurBlobUrl);
  if (blobUrls.length && env().BLOB_READ_WRITE_TOKEN) await del(blobUrls);
  // Local dev files are left in .data — delete the folder to clean up.
}
