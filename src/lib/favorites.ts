import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---- Singleton auth state (1 listener for the whole app) ----
let _userId: string | null = null;
let _authReady = false;
let _initialized = false;
const _listeners = new Set<() => void>();

function notify() { _listeners.forEach((l) => l()); }

function ensureInit() {
  if (_initialized) return;
  // Auth session lives only in the browser (localStorage). Never touch it on SSR.
  if (typeof window === "undefined") return;
  _initialized = true;
  supabase.auth.getUser().then(({ data }) => {
    _userId = data.user?.id ?? null;
    _authReady = true;
    notify();
  }).catch(() => {
    _authReady = true;
    notify();
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    _userId = session?.user?.id ?? null;
    _authReady = true;
    notify();
  });
}

function subscribe(cb: () => void) {
  ensureInit();
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

export function useCurrentUserId() {
  return useSyncExternalStore(subscribe, () => _userId, () => null);
}

/** True once the initial auth state has been resolved (signed in or out). */
export function useAuthReady() {
  return useSyncExternalStore(subscribe, () => _authReady, () => false);
}

// ---- Favorites: single query per user, O(1) membership check ----
export function useFavorites() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["favorites", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("company_id, created_at, companies(id, slug, name, tagline, banner_url, logo_url, plan, featured, cities(name, slug))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useFavoriteIds() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["favorite-ids", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("company_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.company_id as string));
    },
  });
}

export function useToggleFavorite(companyId: string) {
  const qc = useQueryClient();
  const userId = useCurrentUserId();
  const ids = useFavoriteIds();
  const isFav = !!ids.data?.has(companyId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("auth");
      if (isFav) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("company_id", companyId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("favorites").insert({ user_id: userId, company_id: companyId });
      if (error) throw error;
      return true;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["favorite-ids", userId] });
      const prev = qc.getQueryData<Set<string>>(["favorite-ids", userId]);
      const next = new Set(prev ?? []);
      if (isFav) next.delete(companyId); else next.add(companyId);
      qc.setQueryData(["favorite-ids", userId], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["favorite-ids", userId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["favorite-ids", userId] });
      qc.invalidateQueries({ queryKey: ["favorites", userId] });
    },
  });


  return { isFav, isLoggedIn: !!userId, toggle: mutation.mutate, isPending: mutation.isPending };
}
