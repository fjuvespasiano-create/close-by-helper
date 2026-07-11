import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo, toListing, type Listing, type ListingMessage } from "@/lib/marketplace";

export const Route = createFileRoute("/painel/mensagens")({
  head: () => ({ meta: [{ title: "Mensagens — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: Mensagens,
});

type ThreadKey = string; // `${listingId}::${buyerId}`

type Thread = {
  key: ThreadKey;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMsg: ListingMessage;
  unread: number;
};

function Mensagens() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  const [active, setActive] = useState<ThreadKey | null>(null);
  const [draft, setDraft] = useState("");

  const msgsQ = useQuery({
    queryKey: ["mk", "msgs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ListingMessage[]> => {
      const { data, error } = await supabase
        .from("listing_messages").select("*")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as ListingMessage[];
    },
  });

  const threads: Thread[] = useMemo(() => {
    const all = msgsQ.data ?? [];
    const map = new Map<ThreadKey, Thread>();
    for (const m of all) {
      const key = `${m.listing_id}::${m.buyer_id}`;
      const existing = map.get(key);
      const isMineIncoming = m.sender_id !== userId && !m.read_at;
      if (!existing) {
        map.set(key, {
          key, listingId: m.listing_id, buyerId: m.buyer_id, sellerId: m.seller_id,
          lastMsg: m, unread: isMineIncoming ? 1 : 0,
        });
      } else if (isMineIncoming) {
        existing.unread += 1;
      }
    }
    return Array.from(map.values());
  }, [msgsQ.data, userId]);

  const activeThread = threads.find((t) => t.key === active) ?? null;

  const threadMsgsQ = useQuery({
    queryKey: ["mk", "thread", active],
    enabled: !!active,
    queryFn: async (): Promise<ListingMessage[]> => {
      const [lid, bid] = active!.split("::");
      const { data, error } = await supabase.from("listing_messages")
        .select("*").eq("listing_id", lid).eq("buyer_id", bid)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as ListingMessage[];
      // marcar como lidas
      const unreadIds = rows.filter((m) => m.sender_id !== userId && !m.read_at).map((m) => m.id);
      if (unreadIds.length) {
        await supabase.from("listing_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
        qc.invalidateQueries({ queryKey: ["mk", "msgs"] });
      }
      return rows;
    },
  });

  const listingQ = useQuery({
    queryKey: ["mk", "thread-listing", activeThread?.listingId],
    enabled: !!activeThread,
    queryFn: async (): Promise<Listing | null> => {
      const { data } = await supabase.from("listings").select("*").eq("id", activeThread!.listingId).maybeSingle();
      return data ? toListing(data) : null;
    },
  });

  async function send() {
    if (!activeThread || !userId || draft.trim().length < 2) return;
    const { error } = await supabase.from("listing_messages").insert({
      listing_id: activeThread.listingId,
      buyer_id: activeThread.buyerId,
      seller_id: activeThread.sellerId,
      sender_id: userId,
      body: draft.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setDraft("");
    qc.invalidateQueries({ queryKey: ["mk", "thread", active] });
    qc.invalidateQueries({ queryKey: ["mk", "msgs"] });
  }

  if (!userId) return <p className="text-sm text-muted-foreground">Entre para ver suas mensagens.</p>;

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-bold">Mensagens</h1>
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border bg-card">
          <div className="border-b p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversas ({threads.length})
          </div>
          {msgsQ.isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">Carregando…</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageCircle className="mx-auto h-8 w-8 opacity-60" />
              <p className="mt-2">Nenhuma conversa ainda.</p>
              <Link to="/marketplace"><Button variant="link" size="sm">Explorar anúncios</Button></Link>
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y overflow-y-auto">
              {threads.map((t) => (
                <li key={t.key}>
                  <button
                    onClick={() => setActive(t.key)}
                    className={`w-full px-3 py-3 text-left transition hover:bg-muted ${active === t.key ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {t.sellerId === userId ? "Comprador" : "Vendedor"}
                      </span>
                      {t.unread > 0 ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{t.unread}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{t.lastMsg.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(t.lastMsg.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-[70vh] flex-col rounded-lg border bg-card">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
              Selecione uma conversa para começar.
            </div>
          ) : (
            <>
              {listingQ.data ? (
                <Link to="/marketplace/$slug" params={{ slug: listingQ.data.slug }}
                  className="flex items-center gap-3 border-b p-3 hover:bg-muted/50">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                    {listingQ.data.images[0] ? <img src={listingQ.data.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{listingQ.data.title}</p>
                    <p className="text-xs text-muted-foreground">Ver anúncio</p>
                  </div>
                </Link>
              ) : null}
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {(threadMsgsQ.data ?? []).map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {timeAgo(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
                    placeholder="Escreva sua mensagem…" maxLength={2000}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
                  <Button onClick={send} disabled={draft.trim().length < 2} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
