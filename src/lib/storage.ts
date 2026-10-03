import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { put, del } from "@vercel/blob";
import { env } from "@/lib/env";

/**
 * Where files live, first match wins:
 * 1. S3-compatible bucket (Neon storage) when S3_BUCKET + AWS_* are set. Private bucket;
 *    files are served through /api/files/* so no public bucket access is needed.
 * 2. Vercel Blob when BLOB_READ_WRITE_TOKEN is set (public URLs).
 * 3. Local dev: .data/files, served by /api/files/*.
 */
const LOCAL_ROOT = path.join(process.cwd(), ".data", "files");
const FILE_PREFIX = "/api/files/";
const KEY_PATTERN = /^(uploads|listings\/[0-9a-f-]{36})\/[0-9a-f-]{36}\.jpg$/;

type Backend = "s3" | "blob" | "local";

export function storageBackend(): Backend {
  const e = env();
  if (e.S3_BUCKET && e.AWS_ENDPOINT_URL_S3 && e.AWS_ACCESS_KEY_ID && e.AWS_SECRET_ACCESS_KEY) return "s3";
  if (e.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.VERCEL) throw new Error("No file storage configured. Set S3_BUCKET + AWS_* (Neon storage) or BLOB_READ_WRITE_TOKEN.");
  return "local";
}

let s3Client: S3Client | undefined;
function s3() {
  const e = env();
  s3Client ??= new S3Client({
    region: e.AWS_REGION,
    endpoint: e.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    credentials: { accessKeyId: e.AWS_ACCESS_KEY_ID!, secretAccessKey: e.AWS_SECRET_ACCESS_KEY! },
  });
  return s3Client;
}

export async function saveFile(folder: string, ext: string, body: Buffer, contentType: string): Promise<string> {
  const key = `${folder}/${randomUUID()}.${ext}`;
  const backend = storageBackend();
  if (backend === "s3") {
    await s3().send(new PutObjectCommand({ Bucket: env().S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return FILE_PREFIX + key;
  }
  if (backend === "blob") {
    const blob = await put(key, body, { access: "public", contentType, addRandomSuffix: false });
    return blob.url;
  }
  const full = path.join(LOCAL_ROOT, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return FILE_PREFIX + key;
}

/** Validates a key from a /api/files/* URL. Only keys this app creates are accepted. */
export function fileKey(relative: string): string | null {
  return KEY_PATTERN.test(relative) ? relative : null;
}

/** Read by key — used by /api/files/* and readStoredFile. */
export async function readFileByKey(key: string): Promise<Buffer> {
  if (storageBackend() === "s3") {
    const res = await s3().send(new GetObjectCommand({ Bucket: env().S3_BUCKET, Key: key }));
    if (!res.Body) throw new Error("Empty file");
    return Buffer.from(await res.Body.transformToByteArray());
  }
  return readFile(path.join(LOCAL_ROOT, key));
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
  if (url.startsWith(FILE_PREFIX)) {
    const key = fileKey(url.slice(FILE_PREFIX.length));
    if (!key) throw new Error("Bad file path");
    return readFileByKey(key);
  }
  if (!isOurBlobUrl(url)) throw new Error("Unknown file location");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not read stored file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

export function isStoredUrl(url: string) {
  return (url.startsWith(FILE_PREFIX) && !!fileKey(url.slice(FILE_PREFIX.length))) || isOurBlobUrl(url);
}

export async function deleteFiles(urls: string[]) {
  const blobUrls = urls.filter(isOurBlobUrl);
  if (blobUrls.length && env().BLOB_READ_WRITE_TOKEN) await del(blobUrls);

  const keys = urls
    .filter((u) => u.startsWith(FILE_PREFIX))
    .map((u) => fileKey(u.slice(FILE_PREFIX.length)))
    .filter((k): k is string => !!k);
  if (keys.length && storageBackend() === "s3") {
    await s3().send(new DeleteObjectsCommand({ Bucket: env().S3_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
  }
  // Local dev files are left in .data — delete the folder to clean up.
}
