import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Phone, Globe, ExternalLink } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { InlineShopeeStrip } from "@/components/site/InlineShopeeStrip";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { LiveFeedWidget } from "@/features/live-feed";
import { useCityId } from "@/hooks/useCityId";
import {
  PUBLIC_SERVICE_CATEGORIES,
  fetchPublicServices,
  type PublicService,
  type PublicServiceCategory,
} from "@/lib/publicServices";

export const Route = createFileRoute("/vespasiano")({
  head: () => ({
    meta: [
      { title: "Vespasiano — A cidade inteira no seu bolso | AgenddaAqui" },
      {
        name: "description",
        content:
          "O guia oficial de Vespasiano: serviços públicos, plantão 24h, hospitais, escolas, prefeitura, transporte e emergências — tudo num só lugar.",
      },
      { property: "og:title", content: "Vespasiano — A cidade inteira no seu bolso" },
      {
        property: "og:description",
        content: "Serviços públicos de Vespasiano organizados por categoria com endereço, horário e telefone.",
      },
      { property: "og:url", content: "https://close-by-helper.lovable.app/vespasiano" },
    ],
    links: [{ rel: "canonical", href: "https://close-by-helper.lovable.app/vespasiano" }],
  }),
  component: VespasianoPage,
});

function VespasianoPage() {
  const q = useQuery({
    queryKey: ["public-services", "vespasiano", "all"],
    queryFn: () => fetchPublicServices({ citySlug: "vespasiano" }),
  });
  const { data: cityId } = useCityId("vespasiano");

  const services = q.data ?? [];
  const byCategory = new Map<PublicServiceCategory, PublicService[]>();
  for (const s of services) {
    const key = (s.category ?? "outros") as PublicServiceCategory;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(s);
  }

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-surface to-accent/5">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Guia oficial da cidade
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Vespasiano
          </h1>
          <p className="mt-2 font-display text-xl font-semibold text-primary md:text-2xl">
            A cidade inteira no seu bolso
          </p>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            Prefeitura, UPA, escolas, transporte, plantão 24h e as empresas mais indicadas de Vespasiano — endereço, horário e telefone na palma da mão, atualizado por quem mora aqui.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/buscar"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Encontrar um serviço
            </Link>
            <Link
              to="/emergencia"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
            >
              Emergência 24h
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pt-10">
        <LiveFeedWidget cityId={cityId ?? null} title="Acontecendo agora em Vespasiano" />
      </section>

      <section className="container mx-auto px-4 py-10">

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">Serviços Públicos</h2>
            <p className="mt-1 text-muted-foreground">
              Prefeitura, saúde, educação, segurança, transporte e mais — com endereço, horário e contato.
            </p>
          </div>
        </div>

        {q.isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Carregando serviços…</div>
        ) : (
          <div className="space-y-12">
            {PUBLIC_SERVICE_CATEGORIES.map((cat) => {
              const items = byCategory.get(cat.slug) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={cat.slug} id={cat.slug}>
                  <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CategoryIcon name={cat.icon} className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold">{cat.label}</h3>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                    <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((s) => (
                      <ServiceCard key={s.id} s={s} />
                    ))}
                  </div>
                </div>
              );
            })}

            {services.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">Estamos cadastrando os serviços de Vespasiano. Volte em breve — a lista cresce toda semana.</p>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function ServiceCard({ s }: { s: PublicService }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-base font-bold leading-tight text-foreground">{s.name}</h4>
        {s.is_24h ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
            <Clock className="h-3 w-3" /> 24h
          </span>
        ) : null}
      </div>
      {s.subtype ? (
        <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.subtype}</div>
      ) : null}
      {s.description ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
      ) : null}

      <dl className="mt-3 space-y-1.5 text-sm">
        {s.address ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {s.address}
              {s.neighborhood ? ` — ${s.neighborhood}` : ""}
            </span>
          </div>
        ) : null}
        {s.hours ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{s.hours}</span>
          </div>
        ) : null}
        {s.phone ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <Phone className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{s.phone}</span>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {s.phone ? (
          <a
            href={`tel:${s.phone.replace(/\D/g, "")}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Phone className="h-3.5 w-3.5" /> Ligar
          </a>
        ) : null}
        {s.website ? (
          <a
            href={s.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40"
          >
            <Globe className="h-3.5 w-3.5" /> Site oficial
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
