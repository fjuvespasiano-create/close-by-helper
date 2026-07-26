import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { SiteLayout } from "@/components/site/SiteLayout";
import {
  LayoutDashboard, Building2, BadgePercent, Settings, Mail, Landmark, Siren, MapPin,
  Newspaper, CalendarDays, Menu as MenuIcon, Type, Bell, Bug, Copy, Briefcase,
  Megaphone, Compass, Download, BarChart3, ChevronDown, Home, Store, FileText,
  Sparkles, ShieldCheck, DatabaseBackup, Inbox,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — AgenddaAqui" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

type AdminPath =
  | "/admin" | "/admin/empresas" | "/admin/servicos-publicos" | "/admin/emergencia"
  | "/admin/cidades" | "/admin/planos" | "/admin/leads" | "/admin/blog" | "/admin/blog-ai"
  | "/admin/duplicados" | "/admin/eventos" | "/admin/menu" | "/admin/textos"
  | "/admin/push" | "/admin/empregos" | "/admin/turismo" | "/admin/qa"
  | "/admin/solicitacoes" | "/admin/reivindicacoes"
  | "/admin/anuncios" | "/admin/analytics-anuncios" | "/admin/calendario-editorial"
  | "/admin/promocoes"
  | "/admin/scraper-vespasiano" | "/admin/scraper-sjl"
  | "/admin/backup" | "/admin/ao-vivo"
  | "/admin/transicoes"
  | "/admin/documentacao"
  | "/admin/configuracoes";

type NavItem = { to: AdminPath; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { id: string; label: string; icon: typeof LayoutDashboard; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "painel", label: "Painel", icon: Home,
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    id: "local", label: "Cidade & Local", icon: MapPin,
    items: [
      { to: "/admin/cidades", label: "Cidades", icon: MapPin },
      { to: "/admin/servicos-publicos", label: "Serviços Públicos", icon: Landmark },
      { to: "/admin/emergencia", label: "Emergência", icon: Siren },
      { to: "/admin/scraper-vespasiano", label: "Scraper Vespasiano", icon: Download },
      { to: "/admin/scraper-sjl", label: "Scraper São José da Lapa", icon: Download },
    ],
  },
  {
    id: "negocios", label: "Negócios", icon: Store,
    items: [
      { to: "/admin/empresas", label: "Empresas", icon: Building2 },
      { to: "/admin/planos", label: "Planos", icon: BadgePercent },
      { to: "/admin/leads", label: "Leads", icon: Mail },
    ],
  },
  {
    id: "conteudo", label: "Conteúdo", icon: FileText,
    items: [
      { to: "/admin/eventos", label: "Eventos", icon: CalendarDays },
      { to: "/admin/empregos", label: "Empregos", icon: Briefcase },
      { to: "/admin/turismo", label: "Turismo", icon: Compass },
      { to: "/admin/blog", label: "Blog", icon: Newspaper },
      { to: "/admin/blog-ai", label: "Gerador IA (Blog)", icon: Sparkles },
      { to: "/admin/duplicados", label: "Conteúdo duplicado", icon: Copy },
    ],
  },
  {
    id: "marketing", label: "Marketing", icon: Sparkles,
    items: [
      { to: "/admin/calendario-editorial", label: "Calendário Editorial", icon: CalendarDays },
      { to: "/admin/promocoes", label: "Promoções & Cupons", icon: BadgePercent },
      { to: "/admin/anuncios", label: "Anúncios locais", icon: Megaphone },
      { to: "/admin/analytics-anuncios", label: "Analytics de Anúncios", icon: BarChart3 },
      { to: "/admin/push", label: "Notificações Push", icon: Bell },
    ],
  },
  {
    id: "site", label: "Site", icon: MenuIcon,
    items: [
      { to: "/admin/menu", label: "Menu do site", icon: MenuIcon },
      { to: "/admin/textos", label: "Textos do site", icon: Type },
    ],
  },
  {
    id: "sistema", label: "Sistema", icon: ShieldCheck,
    items: [
      { to: "/admin/qa", label: "Central de Qualidade", icon: Bug },
      { to: "/admin/solicitacoes", label: "Solicitações & Pedidos", icon: Inbox },
      { to: "/admin/ao-vivo", label: "Feed Ao Vivo", icon: Siren },
      { to: "/admin/backup", label: "Backup & Restauração", icon: DatabaseBackup },
      { to: "/admin/transicoes", label: "Transições de página", icon: Sparkles },
      { to: "/admin/documentacao", label: "Documentação Técnica", icon: FileText },
      { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

const OPEN_KEY = "admin_nav_open_groups_v1";

function loadOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch { return {}; }
}

function AdminLayout() {
  const { loading, isAdmin, userId } = useAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activeGroupId = useMemo(() => {
    for (const g of GROUPS) {
      for (const item of g.items) {
        const match = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        if (match) return g.id;
      }
    }
    return "painel";
  }, [pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = loadOpen();
    // Ensure active group is open; keep prior preferences for the rest.
    setOpen({ ...saved, [activeGroupId]: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto-open the group of the currently active route on navigation.
    setOpen((prev) => (prev[activeGroupId] ? prev : { ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(OPEN_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

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
              : "Esta área é exclusiva para administradores do AgenddaAqui. Entre com uma conta de admin para continuar."}
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
      <div className="container mx-auto grid gap-6 px-4 py-6 sm:py-8 lg:grid-cols-[240px_1fr]">
        <details className="group rounded-lg border border-border bg-card lg:border-0 lg:bg-transparent lg:[&>summary]:hidden" open={typeof window !== "undefined" && window.innerWidth >= 1024}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold lg:hidden">
            <span className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Menu do admin
            </span>
            <span className="text-xs text-muted-foreground transition group-open:rotate-180">▾</span>
          </summary>
          <aside className="border-t border-border p-2 lg:border-0 lg:p-0">
            <div className="mb-3 hidden px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
              Administração
            </div>
            <nav className="space-y-1" aria-label="Navegação do painel">
              {GROUPS.map((g) => {
                const isOpen = !!open[g.id];
                const groupActive = g.items.some((i) => (i.exact ? pathname === i.to : pathname.startsWith(i.to)));
                const GroupIcon = g.icon;
                return (
                  <div key={g.id}>
                    <button
                      type="button"
                      onClick={() => toggle(g.id)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                        groupActive ? "text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{g.label}</span>
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-1 space-y-0.5 border-l border-border pl-2">
                        {g.items.map((n) => {
                          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                          return (
                            <Link
                              key={n.to}
                              to={n.to}
                              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                                active
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-foreground hover:bg-muted"
                              }`}
                            >
                              <n.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{n.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        </details>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </SiteLayout>
  );
}


