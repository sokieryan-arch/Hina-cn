import type { IncomingMessage } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const CRLF = Buffer.from("\r\n", "latin1");
const HEADER_SEPARATOR = Buffer.from("\r\n\r\n", "latin1");

function requestError(message: string) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function getBoundary(contentType: string | undefined) {
  const match = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match?.[1] ?? match?.[2] ?? null;
}

async function readBody(req: IncomingMessage, maxBytes: number) {
  const chunks: Buffer[] = [];
  let total = 0;
  const maxRequestBytes = maxBytes + 1024 * 1024;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxRequestBytes) {
      throw requestError("avatar_too_large");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function parseAvatarPart(body: Buffer, boundary: string) {
  const delimiter = Buffer.from(`--${boundary}`, "latin1");
  let searchFrom = 0;

  while (searchFrom < body.length) {
    const delimiterStart = body.indexOf(delimiter, searchFrom);
    if (delimiterStart < 0) break;

    let partStart = delimiterStart + delimiter.length;
    if (body.subarray(partStart, partStart + 2).equals(Buffer.from("--", "latin1"))) break;
    if (body.subarray(partStart, partStart + CRLF.length).equals(CRLF)) {
      partStart += CRLF.length;
    }

    const nextDelimiterStart = body.indexOf(delimiter, partStart);
    if (nextDelimiterStart < 0) break;

    let partEnd = nextDelimiterStart;
    if (partEnd >= CRLF.length && body.subarray(partEnd - CRLF.length, partEnd).equals(CRLF)) {
      partEnd -= CRLF.length;
    }

    const part = body.subarray(partStart, partEnd);
    const separatorIndex = part.indexOf(HEADER_SEPARATOR);
    if (separatorIndex < 0) throw requestError("invalid_avatar_upload");

    const headerText = part.subarray(0, separatorIndex).toString("latin1");
    if (!headerText.includes('name="avatar"')) {
      searchFrom = nextDelimiterStart;
      continue;
    }

    const contentType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim().toLowerCase() ?? "";
    return {
      contentType,
      buffer: part.subarray(separatorIndex + HEADER_SEPARATOR.length),
    };
  }

  throw requestError("missing_avatar_file");
}

interface SaveAvatarUploadOptions {
  userId: string;
  uploadsRoot: string;
  maxBytes?: number;
}

export async function saveAvatarUpload(req: IncomingMessage, options: SaveAvatarUploadOptions) {
  const maxBytes = options.maxBytes ?? MAX_AVATAR_BYTES;
  const boundary = getBoundary(req.headers["content-type"]);
  if (!boundary) throw requestError("invalid_avatar_upload");

  const body = await readBody(req, maxBytes);
  const file = parseAvatarPart(body, boundary);
  const extension = MIME_TO_EXTENSION[file.contentType];

  if (!extension) throw requestError("avatar_type_not_supported");
  if (file.buffer.length > maxBytes) throw requestError("avatar_too_large");
  if (file.buffer.length === 0) throw requestError("missing_avatar_file");

  const avatarsDir = path.join(options.uploadsRoot, "avatars");
  await fs.mkdir(avatarsDir, { recursive: true });

  const filename = `${options.userId}-${nanoid(12)}.${extension}`;
  await fs.writeFile(path.join(avatarsDir, filename), file.buffer, { flag: "wx" });
  return `/uploads/avatars/${filename}`;
}
