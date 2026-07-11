// Server-only push dispatch helper. Uses web-push to build headers/body
// and fetch() to actually send — Cloudflare Workers friendly.
import webpush from "web-push";

const configured = (() => {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || "mailto:contato@agendaaqui.app";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(sub, pub, priv);
  return true;
})();

export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type WebPushPayload = Record<string, unknown>;

export type SendResult =
  | { ok: true }
  | { ok: false; status: number; error: string; gone: boolean };

export async function sendWebPush(
  sub: WebPushSubscription,
  payload: WebPushPayload,
  opts?: { ttl?: number; urgency?: "very-low" | "low" | "normal" | "high" },
): Promise<SendResult> {
  if (!configured) return { ok: false, status: 0, error: "VAPID not configured", gone: false };
  try {
    const req = webpush.generateRequestDetails(sub, JSON.stringify(payload), {
      TTL: opts?.ttl ?? 60 * 60 * 12,
      urgency: opts?.urgency ?? "normal",
    });
    const res = await fetch(req.endpoint, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body as BodyInit,
    });
    if (res.ok || res.status === 201 || res.status === 202) return { ok: true };
    const text = await res.text().catch(() => "");
    const gone = res.status === 404 || res.status === 410;
    return { ok: false, status: res.status, error: text || res.statusText, gone };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message, gone: false };
  }
}

export function parseUA(ua: string | null | undefined): { device: string; browser: string } {
  if (!ua) return { device: "unknown", browser: "unknown" };
  const u = ua.toLowerCase();
  let device = "desktop";
  if (/iphone|ipad|ipod/.test(u)) device = "ios";
  else if (/android/.test(u)) device = "android";
  else if (/windows/.test(u)) device = "windows";
  else if (/mac os x/.test(u)) device = "mac";
  else if (/linux/.test(u)) device = "linux";
  let browser = "other";
  if (/edg\//.test(u)) browser = "edge";
  else if (/chrome\//.test(u) && !/edg\//.test(u)) browser = "chrome";
  else if (/safari\//.test(u) && !/chrome\//.test(u)) browser = "safari";
  else if (/firefox\//.test(u)) browser = "firefox";
  return { device, browser };
}
