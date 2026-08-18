const SENTENCE_BOUNDARIES = new Set([".", "!", "?", "。", "！", "？", ";", "；", "\n"]);
const SOFT_BOUNDARIES = new Set([" ", "\t", ",", "，", ":", "：", "、", "-", "—"]);

export const DEFAULT_SPEECH_CHUNK_BYTES = 300;

const encoder = new TextEncoder();

export function speechUtf8Bytes(text: string) {
  return encoder.encode(text).byteLength;
}

function sentenceUnits(text: string) {
  const units: string[] = [];
  let current = "";

  for (const character of text) {
    current += character;
    if (SENTENCE_BOUNDARIES.has(character)) {
      const unit = current.trim();
      if (unit) units.push(unit);
      current = "";
    }
  }

  const remainder = current.trim();
  if (remainder) units.push(remainder);
  return units;
}

function splitOversizedUnit(text: string, maxBytes: number) {
  const parts: string[] = [];
  let remaining = text.trim();

  while (remaining && speechUtf8Bytes(remaining) > maxBytes) {
    let byteCount = 0;
    let safeEnd = 0;
    let preferredEnd = 0;
    let offset = 0;

    for (const character of remaining) {
      const nextBytes = speechUtf8Bytes(character);
      if (byteCount + nextBytes > maxBytes) break;
      byteCount += nextBytes;
      offset += character.length;
      safeEnd = offset;
      if (SOFT_BOUNDARIES.has(character) || SENTENCE_BOUNDARIES.has(character)) {
        preferredEnd = offset;
      }
    }

    if (safeEnd === 0) {
      throw new Error("speech_chunk_limit_too_small");
    }

    const end = preferredEnd >= Math.floor(safeEnd * 0.55) ? preferredEnd : safeEnd;
    const part = remaining.slice(0, end).trim();
    if (part) parts.push(part);
    remaining = remaining.slice(end).trimStart();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

export function splitSpeechText(text: string, maxBytes = DEFAULT_SPEECH_CHUNK_BYTES) {
  if (!Number.isFinite(maxBytes) || maxBytes < 4) {
    throw new Error("invalid_speech_chunk_limit");
  }

  const normalized = text.trim();
  if (!normalized) return [];

  const pieces = sentenceUnits(normalized)
    .flatMap((unit) => splitOversizedUnit(unit, maxBytes));
  const chunks: string[] = [];
  let current = "";

  for (const piece of pieces) {
    const candidate = current ? `${current} ${piece}` : piece;
    if (speechUtf8Bytes(candidate) <= maxBytes) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);
    current = piece;
  }

  if (current) chunks.push(current);
  return chunks;
}
