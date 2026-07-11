// Server-only helpers para assinar/validar delivery tokens (HMAC-SHA256).
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.PUSH_TRACK_SECRET;
  if (!s) throw new Error("PUSH_TRACK_SECRET não configurado.");
  return s;
}

export function signDeliveryToken(deliveryId: number): string {
  const h = createHmac("sha256", secret()).update(String(deliveryId)).digest("base64url");
  // 16 chars é suficiente para anti-forjar (2^96 bits).
  return h.slice(0, 22);
}

export function verifyDeliveryToken(deliveryId: number, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = signDeliveryToken(deliveryId);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
