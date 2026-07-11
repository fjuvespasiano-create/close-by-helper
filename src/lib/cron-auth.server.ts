// Shared auth helper for pg_cron-triggered public hook endpoints.
// Requires a dedicated CRON_SECRET (not any Supabase key) in one of these headers:
//   - `x-cron-secret`  (preferred)
//   - `authorization: Bearer <secret>`
// The legacy `apikey` header comparison against SUPABASE_PUBLISHABLE_KEY was
// removed because that key is public (shipped in the client bundle).

export function checkCronAuth(request: Request): Response | null {
  const expected = process.env.CRON_HOOK_SECRET ?? process.env.CRON_SECRET;
  if (!expected) {
    return new Response(
      JSON.stringify({ error: "server_misconfigured", detail: "CRON_SECRET not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const headerSecret = request.headers.get("x-cron-secret");
  const auth = request.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const provided = headerSecret ?? bearer;
  if (!provided || !timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
