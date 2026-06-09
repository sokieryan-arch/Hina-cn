import { parse, serialize } from "cookie";
import type { Request, Response } from "express";

export const SESSION_COOKIE = "hina_session";

export function getSessionToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string") {
    const match = authorization.match(/^bearer\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();
  }

  const cookies = parse(req.headers.cookie ?? "");
  return cookies[SESSION_COOKIE] ?? null;
}

export function setSessionCookie(res: Response, token: string, expiresAt: string) {
  res.setHeader("Set-Cookie", serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  }));
}

export function clearSessionCookie(res: Response) {
  res.setHeader("Set-Cookie", serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  }));
}
