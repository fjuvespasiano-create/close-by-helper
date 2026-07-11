// Server functions for the admin backup & restore module.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Curated list of tables included in backups (in dependency-safe order for restore).
// Auth-owned tables (profiles, user_roles) and analytics/append-only tables are excluded.
const BACKUP_TABLES = [
  "cities",
  "categories",
  "event_categories",
  "listing_categories",
  "post_categories",
  "plans_config",
  "system_settings",
  "notification_templates",
  "companies",
  "company_categories",
  "company_faqs",
  "company_media",
  "company_projects",
  "listings",
  "promotions",
  "coupons",
  "tourist_attractions",
  "public_services",
  "bus_lines",
  "representatives",
  "editorial_posts",
  "banners",
  "events",
  "jobs",
  "job_sources",
  "emergency_contacts",
  "blog_posts_legacy",
  "posts",
  "shows",
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];

const BUCKET = "backups";
const SCHEMA_VERSION = 1;

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export const adminListBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.storage
      .from(BUCKET)
      .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter((f: any) => f.name && f.name !== ".emptyFolderPlaceholder")
      .map((f: any) => ({
        name: f.name as string,
        size: (f.metadata?.size as number | undefined) ?? 0,
        created_at: (f.created_at as string | undefined) ?? null,
        updated_at: (f.updated_at as string | undefined) ?? null,
      }));
  });

export const adminCreateBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload: {
      schema_version: number;
      created_at: string;
      created_by: string;
      tables: Record<string, unknown[]>;
      counts: Record<string, number>;
    } = {
      schema_version: SCHEMA_VERSION,
      created_at: new Date().toISOString(),
      created_by: context.userId,
      tables: {},
      counts: {},
    };

    const errors: Array<{ table: string; error: string }> = [];
    for (const table of BACKUP_TABLES) {
      const { data, error } = await supabaseAdmin.from(table).select("*");
      if (error) {
        errors.push({ table, error: error.message });
        payload.tables[table] = [];
        payload.counts[table] = 0;
        continue;
      }
      payload.tables[table] = data ?? [];
      payload.counts[table] = data?.length ?? 0;
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `backup-${ts}.json`;
    const body = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(body);

    const { error: upErr } = await context.supabase.storage
      .from(BUCKET)
      .upload(fileName, bytes, {
        contentType: "application/json",
        upsert: false,
      });
    if (upErr) throw new Error(`Falha ao salvar backup: ${upErr.message}`);

    const total = Object.values(payload.counts).reduce((a, b) => a + b, 0);
    return { fileName, size: bytes.byteLength, tables: payload.counts, total, errors };
  });

export const adminGetBackupDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: signed, error } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.name, 300, { download: data.name });
    if (error || !signed) throw new Error(error?.message ?? "Falha ao gerar URL");
    return { url: signed.signedUrl };
  });

export const adminDeleteBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.storage.from(BUCKET).remove([data.name]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RestoreInput = z.object({
  payload: z.object({
    schema_version: z.number(),
    tables: z.record(z.array(z.record(z.unknown()))),
  }),
  mode: z.enum(["upsert", "replace"]).default("upsert"),
  tables: z.array(z.string()).optional(),
});

export const adminRestoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => RestoreInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.payload.schema_version !== SCHEMA_VERSION) {
      throw new Error(
        `Versão de schema incompatível (esperado ${SCHEMA_VERSION}, recebido ${data.payload.schema_version}).`,
      );
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const selected = new Set(data.tables ?? BACKUP_TABLES);
    const results: Array<{ table: string; inserted: number; error?: string }> = [];

    for (const table of BACKUP_TABLES) {
      if (!selected.has(table)) continue;
      const rows = data.payload.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results.push({ table, inserted: 0 });
        continue;
      }

      if (data.mode === "replace") {
        const { error: delErr } = await supabaseAdmin
          .from(table)
          .delete()
          .not("id", "is", null);
        if (delErr) {
          results.push({ table, inserted: 0, error: `delete: ${delErr.message}` });
          continue;
        }
      }

      // Batch upserts to avoid huge payloads.
      const BATCH = 500;
      let inserted = 0;
      let firstError: string | undefined;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const { error } = await supabaseAdmin
          .from(table)
          .upsert(chunk as any, { onConflict: "id" });
        if (error) {
          firstError = error.message;
          break;
        }
        inserted += chunk.length;
      }
      results.push({ table, inserted, error: firstError });
    }

    return { ok: true, results };
  });

export const BACKUP_TABLE_LIST = BACKUP_TABLES as readonly BackupTable[];
