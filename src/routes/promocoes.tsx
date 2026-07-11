import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchActiveCoupons, fetchActivePromotions } from "@/lib/promocoes";
import { CITY_OPTIONS, useSelectedCity } from "@/hooks/useSelectedCity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgePercent, Copy, MapPin, Tag, Ticket, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/promocoes")({
  head: () => ({
    meta: [
      { title: "Promoções perto de você — AgenddaAqui" },
      {
        name: "description",
        content:
          "Descontos exclusivos das empresas parceiras, atualizados em tempo real e organizados por cidade e categoria.",
      },
      { property: "og:title", content: "Promoções perto de você — AgenddaAqui" },
      {
        property: "og:description",
        content:
          "Descontos exclusivos das empresas parceiras, atualizados em tempo real e organizados por cidade e categoria.",
      },
    ],
  }),
  component: PromocoesPage,
});

function PromocoesPage() {
  const { city } = useSelectedCity();
  const [cityFilter, setCityFilter] = useState<string>(city);
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState("");

  const promoQ = useQuery({
    queryKey: ["promotions", cityFilter, category],
    queryFn: () => fetchActivePromotions({ citySlug: cityFilter || undefined, category: category || undefined }),
  });
  const couponQ = useQuery({
    queryKey: ["coupons", cityFilter, category],
    queryFn: () => fetchActiveCoupons({ citySlug: cityFilter || undefined, category: category || undefined }),
  });

  const promotions = useMemo(() => {
    const list = promoQ.data ?? [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        (p.description ?? "").toLowerCase().includes(s) ||
        (p.companies?.name ?? "").toLowerCase().includes(s)
    );
  }, [promoQ.data, q]);

  const coupons = useMemo(() => {
    const list = couponQ.data ?? [];
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter(
      (c) =>
        c.title.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s) ||
        (c.description ?? "").toLowerCase().includes(s)
    );
  }, [couponQ.data, q]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (promoQ.data ?? []).forEach((p) => p.category && set.add(p.category));
    (couponQ.data ?? []).forEach((c) => c.category && set.add(c.category));
    return Array.from(set).sort();
  }, [promoQ.data, couponQ.data]);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Promoções & Cupons
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Promoções perto de você
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Descontos exclusivos das empresas parceiras, atualizados em tempo real e organizados por cidade e
            categoria.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={!cityFilter} onClick={() => setCityFilter("")}>
                Todas as cidades
              </FilterChip>
              {CITY_OPTIONS.map((c) => (
                <FilterChip key={c.slug} active={cityFilter === c.slug} onClick={() => setCityFilter(c.slug)}>
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {c.name}
                </FilterChip>
              ))}
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por promoção, cupom ou empresa…"
              className="sm:max-w-xs"
            />
          </div>

          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <FilterChip active={!category} onClick={() => setCategory("")}>
                Todas categorias
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                  <Tag className="mr-1 inline h-3 w-3" />
                  {c}
                </FilterChip>
              ))}
            </div>
          )}
        </div>
      </section>

      <main className="container mx-auto px-4 py-10 space-y-12">
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">
              <BadgePercent className="mr-2 inline h-5 w-5 text-accent" />
              Ofertas em destaque
            </h2>
            <span className="text-sm text-muted-foreground">
              {promoQ.isLoading ? "…" : `${promotions.length} promoções`}
            </span>
          </div>
          {promoQ.isLoading ? (
            <SkeletonGrid />
          ) : promotions.length === 0 ? (
            <EmptyState
              icon={<BadgePercent className="h-10 w-10 text-muted-foreground" />}
              title="Nenhuma promoção ativa por aqui"
              description="Empresas Premium podem publicar promoções gratuitamente. Seja o primeiro."
              cta={
                <Link to="/planos">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Quero anunciar</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promotions.map((p) => (
                <PromotionCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">
              <Ticket className="mr-2 inline h-5 w-5 text-primary" />
              Cupons de desconto
            </h2>
            <span className="text-sm text-muted-foreground">
              {couponQ.isLoading ? "…" : `${coupons.length} cupons`}
            </span>
          </div>
          {couponQ.isLoading ? (
            <SkeletonGrid />
          ) : coupons.length === 0 ? (
            <EmptyState
              icon={<Ticket className="h-10 w-10 text-muted-foreground" />}
              title="Sem cupons ativos no momento"
              description="Fique de olho — novos cupons são adicionados semanalmente."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coupons.map((c) => (
                <CouponCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PromotionCard({ p }: { p: Awaited<ReturnType<typeof fetchActivePromotions>>[number] }) {
  const cover = p.image_url || p.cover_image;
  const premium = p.companies?.plan === "premium" || p.companies?.plan === "featured";
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <BadgePercent className="h-10 w-10 text-primary/60" />
          </div>
        )}
        {p.discount_percent ? (
          <div className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground shadow-lg">
            -{p.discount_percent}%
          </div>
        ) : null}
        {premium && (
          <div className="absolute left-3 top-3">
            <Badge className="bg-primary/95 text-primary-foreground">Premium</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 font-display text-lg font-bold text-foreground">{p.title}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {p.companies?.name && (
            <Link to="/empresa/$slug" params={{ slug: p.companies.slug }} className="font-semibold text-primary hover:underline">
              {p.companies.name}
            </Link>
          )}
          {p.cities?.name && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {p.cities.name}
            </span>
          )}
          {p.category && <Badge variant="secondary">{p.category}</Badge>}
        </div>
        {(p.price_from || p.price_to) && (
          <div className="mt-3 flex items-baseline gap-2">
            {p.price_from && <span className="text-sm text-muted-foreground line-through">R$ {Number(p.price_from).toFixed(2)}</span>}
            {p.price_to && <span className="text-lg font-bold text-accent">R$ {Number(p.price_to).toFixed(2)}</span>}
          </div>
        )}
        {p.valid_to && (
          <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Válido até {new Date(p.valid_to).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
    </article>
  );
}

function CouponCard({ c }: { c: Awaited<ReturnType<typeof fetchActiveCoupons>>[number] }) {
  const [copied, setCopied] = useState(false);
  const label = c.discount_label || (c.discount_percent ? `${c.discount_percent}% OFF` : "OFERTA");

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      toast.success(`Cupom ${c.code} copiado!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
        c.is_sponsored
          ? "border-accent/40 bg-gradient-to-br from-accent/10 to-primary/5"
          : "border-border bg-card"
      }`}
    >
      {c.is_sponsored && (
        <Badge className="absolute right-3 top-3 bg-accent text-accent-foreground">Patrocinado</Badge>
      )}
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Ticket className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">{label}</div>
          <h3 className="mt-0.5 line-clamp-2 font-display text-base font-bold">{c.title}</h3>
          {c.companies?.name && (
            <Link to="/empresa/$slug" params={{ slug: c.companies.slug }} className="text-xs font-semibold text-primary hover:underline">
              {c.companies.name}
            </Link>
          )}
        </div>
      </div>
      {c.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
      <div className="mt-3 flex items-stretch gap-2">
        <div className="flex-1 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center font-mono text-sm font-bold tracking-wider text-primary">
          {c.code}
        </div>
        <Button size="sm" onClick={copy} variant={copied ? "default" : "outline"}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {c.cities?.name && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {c.cities.name}
          </span>
        )}
        {c.category && <Badge variant="secondary">{c.category}</Badge>}
        {c.valid_to && <span>Válido até {new Date(c.valid_to).toLocaleDateString("pt-BR")}</span>}
      </div>
      {c.link_url && (
        <a
          href={c.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
        >
          Ir para a loja →
        </a>
      )}
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <div className="mb-3">{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
