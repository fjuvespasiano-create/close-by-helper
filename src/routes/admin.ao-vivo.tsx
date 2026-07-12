import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLiveFeed, LiveFeedItemCard } from "@/features/live-feed";
import { EyeOff, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/ao-vivo")({
  head: () => ({
    meta: [
      { title: "Feed Ao Vivo — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLiveFeed,
});

function AdminLiveFeed() {
  const qc = useQueryClient();
  const { items, isLoading } = useLiveFeed({ limit: 100 });

  const hiddenList = useQuery({
    queryKey: ["live-feed-hidden-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_feed_hidden")
        .select("id,source,source_id,reason,hidden_at")
        .order("hidden_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const blacklistQ = useQuery({
    queryKey: ["live-feed-blacklist"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "live_feed_blacklist")
        .maybeSingle();
      const v = data?.value;
      return Array.isArray(v) ? (v as unknown[]).map(String) : [];
    },
  });

  const [blText, setBlText] = useState("");
  useEffect(() => {
    if (blacklistQ.data) setBlText(blacklistQ.data.join(", "));
  }, [blacklistQ.data]);

  const hide = useMutation({
    mutationFn: async ({
      source,
      sourceId,
    }: {
      source: string;
      sourceId: string;
    }) => {
      const { error } = await supabase
        .from("live_feed_hidden")
        .upsert(
          { source, source_id: sourceId, reason: "admin hidden" },
          { onConflict: "source,source_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-feed"] });
      qc.invalidateQueries({ queryKey: ["live-feed-hidden-admin"] });
    },
  });

  const unhide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_feed_hidden").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-feed"] });
      qc.invalidateQueries({ queryKey: ["live-feed-hidden-admin"] });
    },
  });

  const saveBlacklist = useMutation({
    mutationFn: async () => {
      const value = blText
        .split(/[,\n]/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "live_feed_blacklist", value });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-feed-blacklist"] });
      qc.invalidateQueries({ queryKey: ["live-feed"] });
    },
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold">Feed Ao Vivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modere itens exibidos em <code>/ao-vivo</code>.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 text-base font-semibold">Blacklist de palavras</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Itens contendo qualquer uma dessas palavras (título ou descrição) não aparecem no feed. Separe por vírgula.
        </p>
        <textarea
          value={blText}
          onChange={(e) => setBlText(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background p-2 text-sm"
          placeholder="spam, teste, xxx"
        />
        <button
          type="button"
          onClick={() => saveBlacklist.mutate()}
          disabled={saveBlacklist.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saveBlacklist.isPending ? "Salvando…" : "Salvar blacklist"}
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Itens visíveis ({items.length})</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 30).map((it) => (
              <div key={it.key} className="flex items-start gap-2">
                <div className="flex-1">
                  <LiveFeedItemCard item={it} compact />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    hide.mutate({ source: it.source, sourceId: it.sourceId })
                  }
                  disabled={hide.isPending}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Ocultar item"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Ocultar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Ocultos ({hiddenList.data?.length ?? 0})
        </h2>
        {hiddenList.data && hiddenList.data.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {hiddenList.data.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    {h.source}:{h.source_id.slice(0, 8)}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(h.hidden_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => unhide.mutate(h.id)}
                  disabled={unhide.isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum item oculto.</p>
        )}
      </section>
    </div>
  );
}
