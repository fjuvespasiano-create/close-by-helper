import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listAdminPush, deleteAdminPush } from "@/lib/admin-push.functions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/push/historico")({
  head: () => ({ meta: [{ title: "Histórico de envios — Admin" }, { name: "robots", content: "noindex" }] }),
  component: HistoricoPush,
});

type Row = {
  id: string; title: string; body: string; category: string; status: string;
  sent_at: string | null; created_at: string;
  sent_count: number; delivered_count: number; opened_count: number; clicked_count: number; failed_count: number;
  audience: { kind?: string } | null;
};

function HistoricoPush() {
  const load = useServerFn(listAdminPush);
  const del = useServerFn(deleteAdminPush);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-push-list"], queryFn: () => load({}) });
  const mut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-push-list"] }); toast.success("Envio removido."); },
  });
  const rows = data as Row[];

  if (isLoading) return <div className="py-10 text-center text-muted-foreground">Carregando…</div>;
  if (rows.length === 0) return (
    <Card className="p-10 text-center">
      <div className="font-semibold">Nenhum envio ainda</div>
      <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira campanha em "Novo envio".</p>
    </Card>
  );

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide">{r.status}</span>
                <span className="text-xs text-muted-foreground">
                  {r.sent_at ? formatDistanceToNow(new Date(r.sent_at), { addSuffix: true, locale: ptBR })
                             : formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                </span>
                {r.audience?.kind && <span className="text-xs text-muted-foreground">· público: {r.audience.kind}</span>}
              </div>
              <div className="mt-1 font-semibold text-foreground">{r.title}</div>
              <p className="text-sm text-muted-foreground line-clamp-1">{r.body}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Enviadas <b className="text-foreground">{r.sent_count}</b></span>
                <span>Entregues <b className="text-foreground">{r.delivered_count}</b></span>
                <span>Abertas <b className="text-foreground">{r.opened_count}</b></span>
                <span>Cliques <b className="text-foreground">{r.clicked_count}</b></span>
                <span>Falhas <b className="text-foreground">{r.failed_count}</b></span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/push/$id" params={{ id: r.id }}>
                <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> Detalhes</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm("Remover este envio?")) mut.mutate(r.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
