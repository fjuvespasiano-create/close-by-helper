// Compartilhado por todos os `createServerFn` de admin.
// Valida que o usuário autenticado tem role 'admin' via RPC `has_role`.
// Uso: `await assertAdmin(context)` dentro do handler de um serverFn
// que usa `.middleware([requireSupabaseAuth])`.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminContext {
  supabase: SupabaseClient;
  userId: string;
}

export async function assertAdmin(context: AdminContext): Promise<void> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) {
    throw new Error("Acesso restrito a administradores.");
  }
}
