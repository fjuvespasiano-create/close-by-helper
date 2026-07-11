import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Mail, Star, User, Heart, Bell, Trophy, Package, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/painel")({
  head: () => ({ meta: [{ title: "Meu painel — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: PanelLayout,
});

const NAV: { to: "/painel" | "/painel/empresas" | "/painel/leads" | "/painel/avaliacoes" | "/painel/ranking" | "/painel/favoritos" | "/painel/notificacoes" | "/painel/perfil" | "/painel/anuncios" | "/painel/mensagens"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/painel/empresas", label: "Minhas empresas", icon: Building2 },
  { to: "/painel/anuncios", label: "Meus anúncios", icon: Package },
  { to: "/painel/mensagens", label: "Mensagens", icon: MessageCircle },
  { to: "/painel/leads", label: "Leads recebidos", icon: Mail },
  { to: "/painel/avaliacoes", label: "Avaliações", icon: Star },
  { to: "/painel/ranking", label: "Ranking Premium", icon: Trophy },
  { to: "/painel/favoritos", label: "Favoritos", icon: Heart },
  { to: "/painel/notificacoes", label: "Notificações", icon: Bell },
  { to: "/painel/perfil", label: "Meu perfil", icon: User },
];

function PanelLayout() {
  const { loading, userId } = useAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Carregando…</div>
      </SiteLayout>
    );
  }
  if (!userId) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Entre para acessar seu painel</h1>
          <p className="mt-2 text-muted-foreground">Gerencie suas empresas, leads e avaliações em um só lugar.</p>
          <Link to="/auth"><Button className="mt-6">Entrar ou criar conta</Button></Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meu painel</div>
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </SiteLayout>
  );
}
