import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Send, History, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/push")({
  head: () => ({ meta: [{ title: "Central de Notificações — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminPushLayout,
});

const NAV: Array<{ to: "/admin/push" | "/admin/push/novo" | "/admin/push/historico" | "/admin/push/templates"; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
  { to: "/admin/push", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/push/novo", label: "Novo envio", icon: Send },
  { to: "/admin/push/historico", label: "Histórico", icon: History },
  { to: "/admin/push/templates", label: "Templates", icon: FileText },
];

// NOTE: this route is a child of `admin.tsx`, which already provides
// SiteLayout + admin-role gate. This file only renders the local sub-nav
// so we don't double-wrap SiteLayout (header/footer duplicado) nem
// executamos o check de admin duas vezes.
function AdminPushLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">🔔 Central de Notificações</h1>
        <p className="text-sm text-muted-foreground">Envie, agende e acompanhe todas as comunicações push do AgenddaAqui.</p>
      </header>
      <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-2" aria-label="Seções de notificações">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
