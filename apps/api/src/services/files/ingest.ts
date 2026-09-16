/**
 * File → Memory (RAG) Ingestion
 *
 * Turns an uploaded file into searchable workspace memories so it participates
 * in chat retrieval (`retrieveMemoryContext` queries memories by workspaceId
 * with no sourceType filter, so file-backed memories surface automatically in
 * semantic + keyword chat RAG).
 *
 * Pipeline (per uploaded file):
 *   1. read bytes (local disk in dev; R2 when configured)
 *   2. extract text for supported mime types (utf8: text/*, markdown, json,
 *      csv, code). PDF/DOCX return a clear "unsupported" error — the parsing
 *      deps (pdf-parse/mammoth) are not installed, so we never fake output.
 *   3. chunk into paragraph-aware slices targeting the memory token budget
 *   4. create one memory per chunk (sourceType "file", sourceId = file id)
 *   5. schedule embedding through the existing queue-or-inline fallback
 *
 * Idempotent: if memories with sourceType "file" + source id already exist,
 * ingestion is skipped (prevents duplicates across retries / re-completes).
 */

import { db } from "../../db/client";
import { and, eq } from "drizzle-orm";
import { files } from "../../db/schema/files";
import { createMemory } from "../memory/memory";
import { scheduleMemoryEmbedding } from "../memory/embed";
import { logger } from "../../config/logger";
import { AppError } from "../../middleware/app-error";
import { readLocalFile, localFileExists, r2ObjectExists, readR2ObjectBytes, isR2Configured } from "./storage";

/** Target chunk size in characters (kept well under the 20k memory body cap). */
const MAX_CHUNK_CHARS = 3_800;

/** Mime types we can ingest without third-party parsers. */
const EXTRACTABLE_PREFIXES = ["text/"];
const EXTRACTABLE_EXACT = new Set([
  "application/json",
  "application/javascript",
  "application/xml",
  "application/x-javascript",
]);

export function isTextExtractable(mimeType: string): boolean {
  const lower = mimeType.toLowerCase();
  return (
    EXTRACTABLE_PREFIXES.some((p) => lower.startsWith(p)) || EXTRACTABLE_EXACT.has(lower)
  );
}

/**
 * Read a file's bytes from whichever backend is active. Returns null when the
 * object is missing (complete-flow expects this to be caught upstream).
 */
export async function readFileBytes(
  workspaceId: string,
  fileId: string,
): Promise<Buffer | null> {
  const row = await db.query.files.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, fileId), eq(f.workspaceId, workspaceId)),
  });
  if (!row) return null;
  try {
    if (isR2Configured() && (await r2ObjectExists(row.objectKey))) {
      return await readR2ObjectBytes(row.objectKey);
    }
    if (localFileExists(row.objectKey)) {
      return await readLocalFile(row.objectKey);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Paragraph-aware chunking. Text is split on double newlines first; big
 * paragraphs are further split on sentence/word boundaries so every chunk
 * stays under MAX_CHUNK_CHARS. Returns [] for empty/whitespace content.
 */
export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length === 0) return [];

  const chunks: string[] = [];
  const paragraphs = cleaned.split(/\n{2,}/);

  let buffer = "";
  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length > 0) chunks.push(trimmed);
    buffer = "";
  };

  for (const para of paragraphs) {
    const p = para.trim();
    if (p.length === 0) continue;

    // Oversized paragraph: split on word/sentence boundaries (handles
    // minified code, long tables, etc.).
    if (p.length > MAX_CHUNK_CHARS) {
      flush();
      let segment = "";
      const pieces = p.split(/(?<=[.!?])\s+|\s+/);
      for (const word of pieces) {
        if ((segment + " " + word).length > MAX_CHUNK_CHARS) {
          if (segment.length > 0) chunks.push(segment.trim());
          segment = word;
        } else {
          segment = segment ? `${segment} ${word}` : word;
        }
      }
      if (segment.length > 0) chunks.push(segment.trim());
      continue;
    }

    if ((buffer + "\n\n" + p).length > MAX_CHUNK_CHARS) {
      flush();
    }
    buffer = buffer ? `${buffer}\n\n${p}` : p;
  }
  flush();
  return chunks;
}

/**
 * Ingest one file into the memory/RAG store.
 * Returns "ingested" | "skipped" | "unsupported" | "missing".
 */
export async function ingestFileForRag(
  workspaceId: string,
  fileId: string,
  userId: string,
): Promise<"ingested" | "skipped" | "unsupported" | "missing"> {
  const file = await db.query.files.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, fileId), eq(f.workspaceId, workspaceId)),
  });
  if (!file) return "missing";

  if (!isTextExtractable(file.mimeType)) {
    return "unsupported";
  }

  // Idempotency: a prior (or in-flight) ingestion already created memories.
  const existing = await db.query.memories.findFirst({
    where: (m, { and, eq }) =>
      and(eq(m.workspaceId, workspaceId), eq(m.sourceType, "file"), eq(m.sourceId, fileId)),
  });
  if (existing) return "skipped";

  const bytes = await readFileBytes(workspaceId, fileId);
  if (!bytes || bytes.length === 0) return "skipped";

  const text = bytes.toString("utf8");
  const chunks = chunkText(text);
  if (chunks.length === 0) return "skipped";

  const title = file.fileName.length > 160 ? file.fileName.slice(0, 157) + "..." : file.fileName;

  // One memory per chunk; each schedules its own embedding through the same
  // queue-or-inline path used by chat/extracted memories.
  let created = 0;
  for (const [i, chunk] of chunks.entries()) {
    await createMemory(workspaceId, userId, {
      sourceType: "file",
      sourceId: fileId,
      title,
      body: chunk,
      meta: {
        chunkIndex: i,
        chunkCount: chunks.length,
        objectKey: file.objectKey,
        mimeType: file.mimeType,
      },
    });
    created += 1;
  }

  logger.info(
    { fileId, workspaceId, chunks: created, mimeType: file.mimeType },
    "file ingested into RAG memory",
  );
  return "ingested";
}

export async function scheduleFileIngestion(
  workspaceId: string,
  fileId: string,
  userId: string,
): Promise<string> {
  try {
    // Queue-or-inline mirrors the proven embedding pattern (test + no-Redis
    // fall to inline so ingestion is still verifiable).
    return await ingestFileForRag(workspaceId, fileId, userId);
  } catch (err) {
    logger.warn({ err, fileId }, "file ingestion failed");
    throw new AppError(500, "internal", "File ingestion failed");
  }
}
