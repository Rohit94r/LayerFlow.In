import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../../config/env";

/**
 * File storage for attachments.
 *
 * - Local disk (default): apps/api/.data/uploads/<objectKey>, with
 *   authenticated PUT/GET /api/files/:id/content as the "signed URL".
 * - Cloudflare R2: when R2_* env vars are set, returns S3-compatible
 *   presigned PUT/GET URLs against the R2 bucket.
 */

export function isR2Configured(): boolean {
  const env = getEnv();
  return Boolean(
    env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET,
  );
}

/** Root folder for local (non-R2) uploads. Resolved from the apps/api cwd. */
export function uploadsRootDir(): string {
  return path.resolve(process.cwd(), ".data", "uploads");
}

/**
 * Object keys look like "<workspaceId>/<fileId>/<safeFileName>". Every path
 * segment is generated server-side or sanitized, so keys are safe to join
 * onto the uploads root.
 */
export function buildObjectKey(workspaceId: string, fileId: string, fileName: string): string {
  return `${workspaceId}/${fileId}/${sanitizeFileName(fileName)}`;
}

/** Keep only safe filename characters so keys can't escape the uploads dir. */
export function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Guard against names that are only dots ("..") after cleaning.
  return cleaned.replace(/^\.+$/, "_") || "file";
}

function absolutePathFor(objectKey: string): string {
  const abs = path.resolve(uploadsRootDir(), objectKey);
  if (!abs.startsWith(uploadsRootDir() + path.sep)) {
    throw new Error(`unsafe object key: ${objectKey}`);
  }
  return abs;
}

export async function saveLocalFile(objectKey: string, bytes: Buffer): Promise<void> {
  const abs = absolutePathFor(objectKey);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
}

export function localFileExists(objectKey: string): boolean {
  return existsSync(absolutePathFor(objectKey));
}

export async function readLocalFile(objectKey: string): Promise<Buffer> {
  return readFile(absolutePathFor(objectKey));
}

/** Removes the file's folder (each file gets its own <fileId> dir). */
export async function deleteLocalFile(objectKey: string): Promise<void> {
  const abs = absolutePathFor(objectKey);
  await rm(path.dirname(abs), { recursive: true, force: true });
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) return r2Client;
  const env = getEnv();
  if (!isR2Configured()) {
    throw new Error("R2 is not configured");
  }
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return r2Client;
}

/** Test seam: clear the cached S3 client after env changes. */
export function resetR2ClientForTests(): void {
  r2Client = null;
}

const DEFAULT_SIGNED_URL_TTL_SEC = 15 * 60;

/** Presigned PUT for direct browser/client upload to R2. */
export async function createR2UploadUrl(
  objectKey: string,
  mimeType: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL_SEC,
): Promise<string> {
  const env = getEnv();
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET!,
    Key: objectKey,
    ContentType: mimeType,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

/** Presigned GET for downloading an object from R2. */
export async function createR2DownloadUrl(
  objectKey: string,
  fileName: string,
  mimeType: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL_SEC,
): Promise<string> {
  const env = getEnv();
  const safeName = fileName.replace(/"/g, "");
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET!,
    Key: objectKey,
    ResponseContentType: mimeType,
    ResponseContentDisposition: `attachment; filename="${safeName}"`,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn });
}

/** HEAD the object — used by POST /complete to confirm the client uploaded bytes. */
export async function r2ObjectExists(objectKey: string): Promise<boolean> {
  const env = getEnv();
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: env.R2_BUCKET!,
        Key: objectKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteR2Object(objectKey: string): Promise<void> {
  const env = getEnv();
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET!,
      Key: objectKey,
    }),
  );
}
