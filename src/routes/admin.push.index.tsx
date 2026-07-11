import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send, Smartphone, Users, Building2, TrendingUp, MousePointerClick, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { pushDashboardStats } from "@/lib/admin-push.functions";

export const Route = createFileRoute("/admin/push/")({
  head: () => ({ meta: [{ title: "Central de Notificações — Admin" }, { name: "robots", content: "noindex" }] }),
  component: PushDashboard,
});

type Stats = Awaited<ReturnType<typeof pushDashboardStats>>;

function PushDashboard() {
  const load = useServerFn(pushDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["push-dashboard"], queryFn: () => load({}) });

  if (isLoading || !data) return <div className="py-10 text-center text-muted-foreground">Carregando métricas…</div>;
  const s = data as Stats;

  const cards = [
    { label: "Assinantes únicos", value: s.subscribers, icon: Users, color: "text-primary" },
    { label: "Dispositivos", value: s.subscriptions, icon: Smartphone, color: "text-blue-600" },
    { label: "Instalados como app", value: s.pwaInstalls, icon: Smartphone, color: "text-emerald-600" },
    { label: "Empresas", value: s.companies, icon: Building2, color: "text-orange-600" },
    { label: "Premium", value: s.premium, icon: TrendingUp, color: "text-yellow-600" },
    { label: "Grátis", value: s.free, icon: Users, color: "text-slate-600" },
    { label: "Taxa de abertura", value: `${s.openRate}%`, icon: Bell, color: "text-fuchsia-600" },
    { label: "Taxa de clique", value: `${s.clickRate}%`, icon: MousePointerClick, color: "text-cyan-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Visão geral</h2>
          <p className="text-sm text-muted-foreground">Métricas em tempo real da Central AgendaAqui Connect.</p>
        </div>
        <Link to="/admin/push/novo"><Button><Send className="mr-2 h-4 w-4" /> Novo envio</Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-2xl font-bold text-foreground">{c.value}</div>
              </div>
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-4">
          <h3 className="mb-3 font-display font-semibold">Últimos 14 dias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.days}>
                <defs>
                  <linearGradient id="g-sent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-click" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="sent" name="Enviadas" stroke="hsl(var(--primary))" fill="url(#g-sent)" />
                <Area type="monotone" dataKey="clicked" name="Cliques" stroke="#22c55e" fill="url(#g-click)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Último envio
            </div>
            {s.lastSent ? (
              <div className="mt-2">
                <div className="font-semibold">{s.lastSent.title}</div>
                <div className="text-xs text-muted-foreground">{s.lastSent.sent_at ? new Date(s.lastSent.sent_at).toLocaleString("pt-BR") : ""}</div>
                <Link to="/admin/push/$id" params={{ id: s.lastSent.id as string }}>
                  <Button variant="link" className="mt-1 px-0">Ver estatísticas →</Button>
                </Link>
              </div>
            ) : <div className="mt-2 text-sm text-muted-foreground">Nenhum envio ainda.</div>}
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Próximo agendado
            </div>
            {s.nextScheduled ? (
              <div className="mt-2">
                <div className="font-semibold">{s.nextScheduled.title}</div>
                <div className="text-xs text-muted-foreground">{s.nextScheduled.scheduled_at ? new Date(s.nextScheduled.scheduled_at).toLocaleString("pt-BR") : ""}</div>
              </div>
            ) : <div className="mt-2 text-sm text-muted-foreground">Nada agendado.</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
