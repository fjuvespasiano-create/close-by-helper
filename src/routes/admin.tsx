import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAdmin } from "@/hooks/use-admin";
import { SiteLayout } from "@/components/site/SiteLayout";
import { LayoutDashboard, Building2, BadgePercent, Settings, Mail, Landmark, Siren, MapPin, Newspaper, CalendarDays, Menu as MenuIcon, Type, Bell, Bug, Copy } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV: { to: "/admin" | "/admin/empresas" | "/admin/servicos-publicos" | "/admin/emergencia" | "/admin/cidades" | "/admin/planos" | "/admin/leads" | "/admin/blog" | "/admin/duplicados" | "/admin/eventos" | "/admin/menu" | "/admin/textos" | "/admin/push" | "/admin/qa" | "/admin/configuracoes"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/cidades", label: "Cidades", icon: MapPin },
  { to: "/admin/servicos-publicos", label: "Serviços Públicos", icon: Landmark },
  { to: "/admin/emergencia", label: "Emergência", icon: Siren },
  { to: "/admin/empresas", label: "Empresas", icon: Building2 },
  { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin/blog", label: "Blog", icon: Newspaper },
  { to: "/admin/duplicados", label: "Conteúdo duplicado", icon: Copy },
  { to: "/admin/push", label: "Notificações Push", icon: Bell },
  { to: "/admin/qa", label: "Central de Qualidade", icon: Bug },
  { to: "/admin/menu", label: "Menu do site", icon: MenuIcon },
  { to: "/admin/textos", label: "Textos do site", icon: Type },
  { to: "/admin/planos", label: "Planos", icon: BadgePercent },
  { to: "/admin/leads", label: "Leads", icon: Mail },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function AdminLayout() {
  const { loading, isAdmin, userId } = useAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Carregando painel…</div>
      </SiteLayout>
    );
  }
  if (!isAdmin) {
    const isAuthed = !!userId;
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">
            {isAuthed
              ? "Sua conta não tem permissão de administrador. Fale com a equipe se acredita que isso é um engano."
              : "Esta área é exclusiva para administradores do AgendaAqui. Entre com uma conta de admin para continuar."}
          </p>
          <Link
            to={isAuthed ? "/painel" : "/auth"}
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isAuthed ? "Ir para meu painel" : "Entrar"}
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Administração
          </div>
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
