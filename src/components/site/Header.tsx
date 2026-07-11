import { useState, type ComponentType, type SVGProps } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bus,
  Calendar,
  Briefcase,
  Building2,
  Compass,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Newspaper,
  Search,
  ShieldCheck,
  ShoppingBag,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { unreadInboxCount } from "@/lib/push.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { CityPickerDialog } from "./CityPickerDialog";
import { DEFAULT_NAV_ITEMS, fetchNavItems } from "@/lib/navItems";
import { useSiteContent } from "@/lib/siteContent";

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

const NAV_ICONS: Record<string, IconType> = {
  "/": Home,
  "/blog": Newspaper,
  "/buscar": Building2,
  "/eventos": Calendar,
  "/o-que-fazer": Compass,
  "/marketplace": ShoppingBag,
  "/transporte": Bus,
  "/empregos": Briefcase,
  "/promocoes": Megaphone,
};

function stripLeadingEmoji(label: string): string {
  // remove emoji + optional space at start (Home was previously "🏠 Home")
  return label.replace(/^\p{Extended_Pictographic}[\uFE0F\u200D]?\s*/u, "");
}

export function Header() {
  const { data: NAV = DEFAULT_NAV_ITEMS } = useQuery({
    queryKey: ["nav-items"],
    queryFn: fetchNavItems,
    staleTime: 5 * 60_000,
  });
  const site = useSiteContent();
  const { isAdmin, userId } = useAdmin();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthed = !!userId;

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const fetchUnread = useServerFn(unreadInboxCount);
  const { data: unread } = useQuery({
    queryKey: ["push-unread"],
    queryFn: () => fetchUnread({}),
    enabled: isAuthed,
    refetchInterval: 60_000,
  });
  const unreadCount = unread?.count ?? 0;

  async function handleSignOut() {
    // Sign-out hygiene: cancel in-flight protected queries, clear cache,
    // then sign out and send the user to a public route.
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Erro ao sair");
    else toast.success("Você saiu da conta");
    setOpen(false);
    navigate({ to: "/", replace: true });
  }



  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5 group lg:flex-initial" aria-label={`${site.brand.name} — Início`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-lg font-extrabold tracking-tight text-foreground">
              {site.brand.name}
            </div>
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
              {site.brand.tagline}
            </div>
          </div>
        </Link>


        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => {
            const active = isActive(n.to);
            const Icon = NAV_ICONS[n.to];
            const label = stripLeadingEmoji(n.label);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                search={n.to === "/servicos-publicos" ? ({} as any) : undefined}
                className={[
                  "group relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all",
                  n.danger
                    ? "text-destructive hover:bg-destructive/10"
                    : active
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5",
                ].join(" ")}
              >
                {Icon ? (
                  <Icon
                    className={[
                      "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                      n.danger
                        ? ""
                        : active
                        ? "text-primary"
                        : "text-primary/70 group-hover:text-primary",
                    ].join(" ")}
                    strokeWidth={2.2}
                    aria-hidden
                  />
                ) : null}
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>


        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div className="hidden md:inline-flex"><CityPickerDialog /></div>
          {isAdmin ? (
            <Link to="/admin" className="hidden lg:inline-flex" aria-label={site.header.admin_label}>
              <Button variant="ghost" size="sm" className="gap-1"><ShieldCheck className="h-4 w-4" /> {site.header.admin_label}</Button>
            </Link>
          ) : null}
          {isAuthed ? (
            <Link to="/painel" className="hidden lg:inline-flex" aria-label={site.header.panel_label}>
              <Button variant="ghost" size="sm" className="gap-1"><LayoutDashboard className="h-4 w-4" /> {site.header.panel_label}</Button>
            </Link>
          ) : null}
          <Link to="/favoritos" aria-label="Favoritos" className="hidden sm:inline-flex">
            <Button variant="ghost" size="icon" className="rounded-full"><Heart className="h-5 w-5" /></Button>
          </Link>
          {isAuthed ? (
            <Link to="/painel/notificacoes" aria-label="Notificações" className="relative">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          ) : null}
          <Link to="/buscar" className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Buscar" className="rounded-full"><Search className="h-5 w-5" /></Button>
          </Link>
          {isAuthed ? (
            <Button variant="ghost" size="sm" className="hidden lg:inline-flex gap-1" onClick={handleSignOut} aria-label={site.header.logout_label}>
              <LogOut className="h-4 w-4" /> {site.header.logout_label}
            </Button>
          ) : (
            <Link to="/auth" className="hidden lg:inline-flex">
              <Button variant="ghost" size="sm">{site.header.login_label}</Button>
            </Link>
          )}
          <Link to="/planos">
            <Button size="sm" className="btn-shine press-scale rounded-full bg-accent px-3 text-accent-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-md sm:px-4">
              <span className="sm:hidden">Anunciar</span>
              <span className="hidden sm:inline">{site.header.cta_label}</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="lg:hidden rounded-full"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-up">
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {NAV.map((n) => {
              const active = isActive(n.to);
              const Icon = NAV_ICONS[n.to];
              const label = stripLeadingEmoji(n.label);
              return (
                <Link
                  key={n.to}
                  to={n.to as any}
                  search={n.to === "/servicos-publicos" ? ({} as any) : undefined}
                  onClick={() => setOpen(false)}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    n.danger
                      ? "text-destructive hover:bg-destructive/10"
                      : active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-primary/5 hover:text-primary",
                  ].join(" ")}
                >
                  {Icon ? (
                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        n.danger
                          ? "bg-destructive/10 text-destructive"
                          : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      ].join(" ")}
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                  ) : null}
                  <span>{label}</span>
                </Link>
              );
            })}

            {(isAuthed || isAdmin) ? (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
                {isAuthed ? (
                  <Link to="/painel" className="col-span-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full gap-2"><LayoutDashboard className="h-4 w-4" /> Meu painel</Button>
                  </Link>
                ) : null}
                {isAdmin ? (
                  <Link to="/admin" className="col-span-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full gap-2"><ShieldCheck className="h-4 w-4" /> Admin</Button>
                  </Link>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Link to="/favoritos" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full gap-2"><Heart className="h-4 w-4" /> Favoritos</Button>
              </Link>
              {isAuthed ? (
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              ) : (
                <Link to="/auth" className="flex-1" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">Entrar</Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
