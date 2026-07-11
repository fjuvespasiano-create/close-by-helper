import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { panelStats, listMyCompanies } from "@/lib/panel";
import { Building2, Mail, Star, Eye, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnableNotifications } from "@/components/site/EnableNotifications";
import { ProfileCompleteness } from "@/components/panel/ProfileCompleteness";

export const Route = createFileRoute("/painel/")({
  component: PanelHome,
});

function PanelHome() {
  const { userId } = useAdmin();
  const stats = useQuery({ queryKey: ["panel-stats", userId], queryFn: () => panelStats(userId!), enabled: !!userId });
  const companies = useQuery({ queryKey: ["panel-companies", userId], queryFn: () => listMyCompanies(userId!), enabled: !!userId });
  const s = stats.data;

  const cards = [
    { label: "Empresas ativas", value: s?.companyCount ?? 0, icon: Building2 },
    { label: "Visitas ao perfil", value: s?.totalViews ?? 0, icon: Eye },
    { label: "Contatos recebidos", value: s?.totalLeads ?? 0, icon: Mail, hint: `${s?.leads7d ?? 0} nos últimos 7 dias` },
    { label: "Avaliações", value: s?.totalReviews ?? 0, icon: Star },
    { label: "Salvos como favorito", value: s?.favoritesCount ?? 0, icon: Heart },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Seu painel</h1>
          <p className="text-sm text-muted-foreground">Acompanhe visitas, contatos e avaliações das suas empresas em tempo real.</p>
        </div>
        <Link to="/painel/empresas/nova"><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Nova empresa</Button></Link>
      </div>

      <div className="mt-4"><EnableNotifications /></div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground"><c.icon className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">{c.label}</span></div>
            <div className="mt-2 text-2xl font-bold">{stats.isLoading ? "—" : c.value}</div>
            {c.hint ? <div className="text-xs text-muted-foreground">{c.hint}</div> : null}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Minhas empresas</h2>
        <div className="mt-3 space-y-2">
          {companies.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando suas empresas…</div>
          ) : (companies.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="font-medium">Sua vitrine ainda está vazia</p>
              <p className="mt-1 text-sm text-muted-foreground">Cadastre sua empresa em 2 minutos e comece a receber contatos de clientes da região hoje mesmo.</p>
              <Link to="/painel/empresas/nova"><Button className="mt-4 gap-1"><Plus className="h-4 w-4" /> Cadastrar minha empresa</Button></Link>
            </div>
          ) : (
            (companies.data ?? []).slice(0, 5).map((c) => (
              <Link key={c.id} to="/painel/empresas/$id" params={{ id: c.id }} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Status: {c.status ?? "—"} · Plano: {c.plan ?? "free"} · {c.views_count ?? 0} visitas ao perfil</div>
                </div>
                <div className="text-xs text-muted-foreground">Gerenciar →</div>
              </Link>
            ))
          )}
        </div>
      </div>

      {(companies.data ?? []).length > 0 ? (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold">Otimize seus perfis</h2>
          <p className="text-sm text-muted-foreground">Quanto mais completo, melhor você aparece na busca.</p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {(companies.data ?? []).slice(0, 4).map((c) => (
              <div key={c.id}>
                <div className="mb-1 text-sm font-medium truncate">{c.name}</div>
                <ProfileCompleteness company={c as Record<string, unknown>} companyId={c.id} compact />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
