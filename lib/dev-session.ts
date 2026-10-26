import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const DEV_SESSION_COOKIE = "dev_session";
export const DEV_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

export function developerPassword(): string {
  return process.env.DEVELOPER_PASSWORD?.trim() ?? "";
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function passwordsMatch(input: string, expected: string): boolean {
  if (!input || !expected) return false;
  return timingSafeEqual(digest(input), digest(expected));
}

function signExpiry(exp: number, secret: string): string {
  return createHmac("sha256", secret).update(String(exp)).digest("base64url");
}

export function createSessionValue(secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + DEV_SESSION_MAX_AGE;
  return `${exp}.${signExpiry(exp, secret)}`;
}

export function isValidSessionValue(
  value: string | undefined,
  secret: string,
): boolean {
  if (!value || !secret) return false;
  const [expText, mac] = value.split(".");
  const exp = Number(expText);
  if (!Number.isFinite(exp) || !mac) return false;
  if (exp * 1000 < Date.now()) return false;

  const expected = signExpiry(exp, secret);
  const actualBytes = Buffer.from(mac);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(actualBytes, expectedBytes);
}

export function isDeveloperSession(value: string | undefined): boolean {
  return isValidSessionValue(value, developerPassword());
}
