// Server function que dispara o scraper de serviços públicos (admin only).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const runServicesScrapeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !isAdmin) throw new Error("Acesso restrito a administradores.");
    const { runServicesScrape } = await import("./services-scrape.server");
    return runServicesScrape();
  });
