import type { ParsedIdentifier } from "./types.js";

export function parseIdentifier(raw: string): ParsedIdentifier {
  const value = raw.trim();
  if (!value) throw new Error("identifier_required");

  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("invalid_email");
    }
    return { kind: "email", value: email };
  }

  const digits = value.replace(/[^\d+]/g, "");
  const withoutPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  const normalized = withoutPlus.startsWith("86") && withoutPlus.length === 13
    ? `+${withoutPlus}`
    : withoutPlus.length === 11 && withoutPlus.startsWith("1")
      ? `+86${withoutPlus}`
      : digits;

  if (!/^\+86\d{11}$/.test(normalized)) {
    throw new Error("invalid_phone");
  }

  return { kind: "phone", value: normalized };
}

export function publicMaskedIdentifier(identifier: ParsedIdentifier): string {
  if (identifier.kind === "email") {
    const [name, domain] = identifier.value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return `${identifier.value.slice(0, 5)}****${identifier.value.slice(-4)}`;
}
