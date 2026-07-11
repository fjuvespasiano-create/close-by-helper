import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminStats } from "@/lib/admin";
import { Building2, Crown, Sparkles, Eye, Calendar, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: adminStats });

  const cards = [
    { label: "Total empresas", value: data?.total ?? 0, icon: Building2, color: "text-primary" },
    { label: "Grátis", value: data?.free ?? 0, icon: BadgeCheck, color: "text-muted-foreground" },
    { label: "Premium", value: data?.premium ?? 0, icon: Sparkles, color: "text-primary" },
    { label: "Destaques", value: data?.featured ?? 0, icon: Crown, color: "text-accent" },
    { label: "Novos (7 dias)", value: data?.recent7d ?? 0, icon: Calendar, color: "text-emerald-600" },
    { label: "Visualizações", value: data?.views ?? 0, icon: Eye, color: "text-blue-600" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Visão geral do AgendaAqui</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="mt-2 text-3xl font-bold">{isLoading ? "…" : c.value.toLocaleString("pt-BR")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
