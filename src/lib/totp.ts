import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

/** RFC 4648 base32 secret, the format authenticator apps expect. */
export function generateTotpSecret(byteLength = 20) {
  const bytes = randomBytes(byteLength);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");

  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(input: string) {
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Ungültiges Zeichen im TOTP-Secret.");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0xf;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

export function totpCode(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / STEP_SECONDS);
  return hotp(base32Decode(secret), counter);
}

export function verifyTotp(secret: string, token: string, options?: { window?: number; timestamp?: number }) {
  const normalized = token.replace(/\s/g, "");
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(normalized)) return false;

  const window = options?.window ?? 1;
  const counter = Math.floor((options?.timestamp ?? Date.now()) / 1000 / STEP_SECONDS);
  const secretBuffer = base32Decode(secret);
  const candidate = Buffer.from(normalized);

  for (let drift = -window; drift <= window; drift += 1) {
    const expected = Buffer.from(hotp(secretBuffer, counter + drift));
    if (expected.length === candidate.length && timingSafeEqual(expected, candidate)) return true;
  }
  return false;
}

export function buildOtpAuthUrl(params: { secret: string; account: string; issuer?: string }) {
  const issuer = params.issuer ?? "Fleetbase";
  const label = encodeURIComponent(`${issuer}:${params.account}`);
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS)
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () =>
    randomBytes(5).toString("hex").toUpperCase().replace(/(.{5})(.{5})/, "$1-$2")
  );
}

export function hashRecoveryCode(code: string) {
  return createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
}
