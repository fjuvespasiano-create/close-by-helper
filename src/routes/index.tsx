import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Siren } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { AgoraWidget } from "@/components/site/AgoraWidget";
import { RepresentativesWidget } from "@/components/site/RepresentativesWidget";
import { SearchBar } from "@/components/site/SearchBar";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { CompanyCard, toCompanyCardData } from "@/components/site/CompanyCard";
import { CitySwitch } from "@/components/site/CitySwitch";
import { FeaturedCouponsCard } from "@/components/site/FeaturedCouponsCard";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { categoriesQueryOptions, featuredCompaniesQueryOptions } from "@/lib/queries";
import { PUBLIC_SERVICE_CATEGORIES } from "@/lib/publicServices";
import { useSelectedCity, CITY_OPTIONS } from "@/hooks/useSelectedCity";
import { useSiteContent } from "@/lib/siteContent";
import heroCityAsset from "@/assets/hero-city.jpg.asset.json";
import heroVespasianoAsset from "@/assets/hero-vespasiano.jpg.asset.json";
import heroSjlAsset from "@/assets/hero-sao-jose-da-lapa.jpg.asset.json";

const HERO_BY_CITY: Record<string, { url: string; alt: string }> = {
  "vespasiano": {
    url: heroVespasianoAsset.url,
    alt: "Vista aérea de Vespasiano ao entardecer, com a Serra do Cipó ao fundo",
  },
  "sao-jose-da-lapa": {
    url: heroSjlAsset.url,
    alt: "Vista aérea de São José da Lapa ao entardecer, com a formação rochosa da Lapa em destaque",
  },
};
const HERO_FALLBACK = { url: heroCityAsset.url, alt: "Vista aérea de Vespasiano e São José da Lapa ao entardecer" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgenddaAqui — a cidade inteira de Vespasiano e São José da Lapa no seu bolso" },
      { name: "description", content: "Encontre em 2 toques hospital, escola, delegacia, prefeitura, plantão 24h e as empresas mais bem avaliadas de Vespasiano e São José da Lapa. Grátis, atualizado, feito por quem mora aqui." },
      { property: "og:title", content: "AgenddaAqui — a cidade inteira num só app" },
      { property: "og:description", content: "Serviços públicos, emergência 24h e as empresas de confiança da região. Avaliações reais dos vizinhos, endereço e telefone à mão." },
      { property: "og:image", content: heroCityAsset.url },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: heroCityAsset.url },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preload", as: "image", href: heroCityAsset.url, fetchpriority: "high" },
    ],
  }),
  component: Home,
  loader: ({ context }) => {
    // Prime cache in parallel so first paint has data (also warms on hover
    // preload since defaultPreload: "intent").
    void context.queryClient.prefetchQuery(categoriesQueryOptions);
    void context.queryClient.prefetchQuery(featuredCompaniesQueryOptions(8));
  },
});

type Category = { id: string; slug: string; name: string; icon?: string | null };

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to="/categoria/$slug"
      params={{ slug: category.slug }}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42/0.18)] focus-ring active:translate-y-0 active:scale-[0.98]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md">
        <CategoryIcon name={category.icon} className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-foreground">{category.name}</div>
    </Link>
  );
}

function PublicServiceCard({ slug, label, icon, description }: { slug: string; label: string; icon: string; description: string }) {
  return (
    <Link
      to="/servicos-publicos"
      search={{ cat: slug }}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_32px_-12px_rgb(15_23_42/0.18)] focus-ring active:translate-y-0 active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
        <CategoryIcon name={icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-foreground transition-colors group-hover:text-primary">{label}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}

function Home() {
  const { city } = useSelectedCity();
  const cityName = CITY_OPTIONS.find((c) => c.slug === city)?.name ?? "sua cidade";
  const site = useSiteContent();
  const cats = useQuery(categoriesQueryOptions);
  const featured = useQuery(featuredCompaniesQueryOptions(8));

  const hero = HERO_BY_CITY[city] ?? HERO_FALLBACK;

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-primary text-primary-foreground">
        {/* Background image — troca com fade conforme a cidade detectada */}
        <img
          key={hero.url}
          src={hero.url}
          alt={hero.alt}
          width={1600}
          height={1008}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full animate-fade-in object-cover"
        />

        {/* Layered overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/85 via-primary/75 to-primary/95 mix-blend-multiply" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl" />

        {/* Content */}
        <div className="container relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center md:py-28">
          {/* Badge */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {site.home.hero_overline}
            </span>
          </div>

          {/* Headline */}
          <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
            {site.home.hero_title.replace(/\{city\}|sua cidade/i, "").trim() || "Tudo o que oferece, num só app"}{" "}
            <span className="bg-gradient-to-r from-accent via-accent to-orange-300 bg-clip-text text-transparent md:whitespace-nowrap">
              {cityName}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-blue-50/90 md:text-xl">
            {site.home.hero_subtitle}
          </p>

          {/* Control center */}
          <div className="mt-10 flex w-full max-w-2xl flex-col items-center gap-6">
            <div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-1.5 backdrop-blur-xl">
              <CitySwitch onDark />
            </div>

            <div className="w-full">
              <SearchBar />
            </div>

            <nav aria-label="Atalhos rápidos" className="flex flex-wrap justify-center gap-x-8 gap-y-2 pt-1 text-sm text-white/60">
              <Link to="/emergencia" className="transition-colors hover:text-accent">Emergência 24h</Link>
              <Link to="/servicos-publicos" search={{ cat: "saude" }} className="transition-colors hover:text-accent">Postos de saúde</Link>
              <Link to="/servicos-publicos" search={{ cat: "educacao" }} className="transition-colors hover:text-accent">Vagas escolares</Link>
              <Link to="/agora" className="transition-colors hover:text-accent">Eventos hoje</Link>
            </nav>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>


      {/* EMERGENCY CTA */}
      <section className="container relative z-10 mx-auto -mt-8 px-4 md:-mt-10">
        <Link
          to="/emergencia"
          className="group focus-ring flex flex-col items-start justify-between gap-4 rounded-2xl border border-border border-l-[6px] border-l-destructive bg-card p-5 shadow-elevated transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-24px_rgb(220_38_38/0.35)] sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive transition-transform duration-300 group-hover:scale-105">
              <Siren className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-bold text-foreground">Emergência? Todos os números 24h aqui.</div>
              <div className="mt-0.5 text-sm text-muted-foreground">SAMU, Bombeiros, Polícia, hospitais e farmácias de plantão — 1 toque para ligar.</div>
            </div>
          </div>
          <div className="btn-shine inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:shadow-md">
            Ver agora <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </Link>
      </section>

      {/* AGORA NA CIDADE */}
      <AgoraWidget />

      {/* REPRESENTANTES */}
      <RepresentativesWidget />

      {/* PUBLIC SERVICES */}
      <section className="container mx-auto px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Resolva com a cidade</h2>
            <p className="mt-1 text-muted-foreground">Saúde, educação, segurança e prefeitura — endereço, telefone e horário em 2 toques.</p>
          </div>
          <Link to="/servicos-publicos" search={{}} className="group hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:inline-flex">
            Ver todos <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="reveal-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PUBLIC_SERVICE_CATEGORIES.filter((c) => c.slug !== "outros").map((c) => (
            <PublicServiceCard key={c.slug} {...c} />
          ))}
        </div>
      </section>

      {/* BUSINESS CATEGORIES */}
      <section className="bg-surface py-14">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Empresas de confiança</h2>
              <p className="mt-1 text-muted-foreground">{(cats.data ?? []).length} categorias com quem atende de verdade em {cityName}.</p>
            </div>
            <Link to="/buscar" className="group hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:inline-flex">
              Ver todas <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="reveal-grid hidden gap-3 md:grid md:grid-cols-4 lg:grid-cols-6">
            {(cats.data ?? []).map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
          <div className="md:hidden">
            <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-3">
                {(cats.data ?? []).map((c) => (
                  <CarouselItem key={c.id} className="basis-[44%] pl-3">
                    <CategoryCard category={c} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="container mx-auto px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">As queridinhas da vizinhança</h2>
            <p className="mt-1 text-muted-foreground">Escolhidas por quem mora aqui, com base em avaliações reais.</p>
          </div>
          <Link to="/buscar" className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver tudo <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="reveal-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(featured.data ?? []).map((co) => (
            <CompanyCard key={co.id} company={toCompanyCardData(co)} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-orange-500 to-orange-600 p-8 text-accent-foreground shadow-[0_20px_60px_-20px_rgb(234_88_12/0.5)] md:p-14">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">Sua empresa aparecendo aqui</h3>
              <p className="mt-2 max-w-xl text-white/95">
                Cadastro em 2 minutos, sem cartão e sem taxa. Fique visível para quem já procura seu serviço em {cityName} e receba os contatos direto no seu WhatsApp.
              </p>
            </div>
            <Link
              to="/auth"
              className="group btn-shine focus-ring inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-accent shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              Anunciar grátis agora <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
