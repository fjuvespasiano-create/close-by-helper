import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminPush } from "@/lib/admin-push.functions";
import { ArrowLeft, Bell } from "lucide-react";

export const Route = createFileRoute("/admin/push/$id")({
  head: () => ({ meta: [{ title: "Detalhes do envio — Admin" }, { name: "robots", content: "noindex" }] }),
  component: PushDetail,
});

function PushDetail() {
  const { id } = Route.useParams();
  const load = useServerFn(getAdminPush);
  const { data, isLoading } = useQuery({ queryKey: ["admin-push-detail", id], queryFn: () => load({ data: { id } }) });

  if (isLoading || !data) return <div className="py-10 text-center text-muted-foreground">Carregando…</div>;
  const { notification: n, byDevice, byBrowser, totalDeliveries } = data as {
    notification: { title: string; body: string; emoji?: string | null; color?: string | null; image_url?: string | null; url?: string | null; category: string; status: string; sent_at?: string | null; sent_count: number; delivered_count: number; opened_count: number; clicked_count: number; failed_count: number; unsubscribed_count: number; audience: { kind?: string } | null };
    byDevice: Record<string, number>;
    byBrowser: Record<string, number>;
    totalDeliveries: number;
  };

  const rate = (num: number) => n.sent_count > 0 ? `${((num / n.sent_count) * 100).toFixed(1)}%` : "—";

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/push/historico"><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button></Link>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ background: n.color ? `${n.color}22` : "hsl(var(--primary) / 0.1)", color: n.color ?? "hsl(var(--primary))" }}>
            {n.emoji ?? <Bell className="h-6 w-6" />}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{n.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wide">{n.status}</span>
              <span>Categoria: {n.category}</span>
              <span>Público: {n.audience?.kind ?? "all"}</span>
              {n.sent_at && <span>Enviada em {new Date(n.sent_at).toLocaleString("pt-BR")}</span>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Enviadas", value: n.sent_count },
          { label: "Entregues", value: n.delivered_count, rate: rate(n.delivered_count) },
          { label: "Abertas", value: n.opened_count, rate: rate(n.opened_count) },
          { label: "Cliques", value: n.clicked_count, rate: rate(n.clicked_count) },
          { label: "Falhas", value: n.failed_count },
          { label: "Descadastros", value: n.unsubscribed_count },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-2xl font-bold">{c.value}</div>
            {c.rate ? <div className="text-xs text-muted-foreground">{c.rate}</div> : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Por dispositivo</h3>
          <BarList items={byDevice} total={totalDeliveries} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Por navegador</h3>
          <BarList items={byBrowser} total={totalDeliveries} />
        </Card>
      </div>
    </div>
  );
}

function BarList({ items, total }: { items: Record<string, number>; total: number }) {
  const entries = Object.entries(items).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div className="text-sm text-muted-foreground">Sem dados ainda.</div>;
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-xs">
            <span className="capitalize">{k}</span>
            <span className="text-muted-foreground">{v} ({total ? Math.round((v / total) * 100) : 0}%)</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: total ? `${(v / total) * 100}%` : "0%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
