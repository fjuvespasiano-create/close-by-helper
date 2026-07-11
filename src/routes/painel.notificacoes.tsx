import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, BellOff, Star, Archive, Trash2, CheckCheck, Search, ExternalLink, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { EnableNotifications } from "@/components/site/EnableNotifications";
import { listMyInbox, inboxAction, markAllRead, unreadInboxCount } from "@/lib/push.functions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/painel/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: NotifPage,
});

type Tab = "all" | "unread" | "read" | "favorites" | "archived";

function NotifPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const list = useServerFn(listMyInbox);
  const act = useServerFn(inboxAction);
  const markAll = useServerFn(markAllRead);
  const unread = useServerFn(unreadInboxCount);

  const { data: unreadCount } = useQuery({ queryKey: ["push-unread"], queryFn: () => unread({}) });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["push-inbox", tab, q],
    queryFn: () => list({ data: { tab, q: q || undefined, limit: 100 } }),
  });

  const mut = useMutation({
    mutationFn: (v: { id: number; action: "read" | "unread" | "favorite" | "unfavorite" | "archive" | "unarchive" | "delete" }) =>
      act({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["push-inbox"] });
      qc.invalidateQueries({ queryKey: ["push-unread"] });
    },
  });

  const markMut = useMutation({
    mutationFn: () => markAll({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["push-inbox"] });
      qc.invalidateQueries({ queryKey: ["push-unread"] });
      toast.success("Tudo marcado como lido.");
    },
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "unread", label: `Não lidas${unreadCount?.count ? ` (${unreadCount.count})` : ""}` },
    { key: "read", label: "Lidas" },
    { key: "favorites", label: "Favoritas" },
    { key: "archived", label: "Arquivadas" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Tudo o que o AgendaAqui envia pra você em um só lugar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/painel/notificacoes/preferencias">
            <Button variant="outline" size="sm"><Settings2 className="mr-2 h-4 w-4" /> Preferências</Button>
          </Link>
          <Button size="sm" onClick={() => markMut.mutate()} disabled={markMut.isPending || !unreadCount?.count}>
            <CheckCheck className="mr-2 h-4 w-4" /> Marcar tudo como lida
          </Button>
        </div>
      </header>

      <EnableNotifications />

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              tab === t.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar" className="pl-8" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center">
          <BellOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <div className="font-semibold">Nada por aqui ainda</div>
          <p className="mt-1 text-sm text-muted-foreground">Assim que houver novidades, elas aparecem aqui.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(items as Array<{ id: number; received_at: string; read_at: string | null; favorite_at: string | null; archived_at: string | null; notification: unknown }>).map((row) => {
            const n = row.notification as { id: string; title: string; body: string; icon_url?: string | null; image_url?: string | null; url?: string | null; emoji?: string | null; color?: string | null; created_at?: string } | null;
            if (!n) return null;
            const isUnread = !row.read_at;
            return (
              <Card key={row.id} className={`overflow-hidden p-4 transition ${isUnread ? "border-primary/40 bg-primary/[0.03]" : ""}`}>
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                    style={{ background: n.color ? `${n.color}22` : "hsl(var(--primary) / 0.1)", color: n.color ?? "hsl(var(--primary))" }}
                  >
                    {n.emoji ?? <Bell className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-semibold text-foreground">{n.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(row.received_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    {n.image_url ? (
                      <img src={n.image_url} alt="" className="mt-3 max-h-40 rounded-md object-cover" />
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {n.url ? (
                        <a href={n.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="secondary" onClick={() => { if (isUnread) mut.mutate({ id: row.id, action: "read" }); }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Abrir
                          </Button>
                        </a>
                      ) : null}
                      {isUnread ? (
                        <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: row.id, action: "read" })}>Marcar como lida</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: row.id, action: "unread" })}>Marcar como não lida</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: row.id, action: row.favorite_at ? "unfavorite" : "favorite" })}>
                        <Star className={`mr-1 h-4 w-4 ${row.favorite_at ? "fill-yellow-400 text-yellow-500" : ""}`} />
                        {row.favorite_at ? "Favorita" : "Favoritar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: row.id, action: row.archived_at ? "unarchive" : "archive" })}>
                        <Archive className="mr-1 h-4 w-4" /> {row.archived_at ? "Desarquivar" : "Arquivar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => mut.mutate({ id: row.id, action: "delete" })}>
                        <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
