import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Siren, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { SearchBar } from "@/components/site/SearchBar";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { CompanyCard, toCompanyCardData } from "@/components/site/CompanyCard";
import { CitySwitch } from "@/components/site/CitySwitch";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { categoriesQueryOptions, featuredCompaniesQueryOptions } from "@/lib/queries";
import { PUBLIC_SERVICE_CATEGORIES } from "@/lib/publicServices";
import { useSelectedCity, CITY_OPTIONS } from "@/hooks/useSelectedCity";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgendaAqui — o app de Vespasiano e São José da Lapa" },
      { name: "description", content: "Encontre em segundos hospital, escola, delegacia, prefeitura e as empresas mais bem avaliadas de Vespasiano e São José da Lapa. Grátis, feito por quem mora aqui." },
      { property: "og:title", content: "AgendaAqui — tudo da sua cidade num só app" },
      { property: "og:description", content: "Serviços públicos, emergência e as empresas de confiança de Vespasiano e São José da Lapa. Endereço, telefone e avaliações reais." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
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

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> {site.home.hero_overline}
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] md:text-6xl lg:text-7xl">
              {site.home.hero_title.replace(/\{city\}|sua cidade/i, "").trim() || "Tudo sobre"} <span className="md:whitespace-nowrap bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">{cityName}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/85 md:text-lg">
              {site.home.hero_subtitle}
            </p>
            <div className="mt-7 flex justify-center"><CitySwitch onDark /></div>
          </div>
          <div className="mx-auto mt-10 max-w-3xl">
            <SearchBar />
          </div>
        </div>
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
              <div className="font-display text-lg font-bold text-foreground">Plantão e Emergência 24h</div>
              <div className="mt-0.5 text-sm text-muted-foreground">Acesso rápido a SAMU, Bombeiros, Polícia, hospitais e farmácias de plantão.</div>
            </div>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition-transform duration-300 group-hover:translate-x-0.5">
            Ver números <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      {/* PUBLIC SERVICES */}
      <section className="container mx-auto px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Serviços da cidade</h2>
            <p className="mt-1 text-muted-foreground">Saúde, educação, segurança e prefeitura. Endereço, telefone e horário em segundos.</p>
          </div>
          <Link to="/servicos-publicos" search={{}} className="hidden text-sm font-medium text-primary hover:underline md:inline-flex">
            Ver todos
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
            <Link to="/buscar" className="hidden text-sm font-medium text-primary hover:underline md:inline-flex">
              Ver todas
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
            <h2 className="font-display text-2xl font-bold md:text-3xl">As preferidas da vizinhança</h2>
            <p className="mt-1 text-muted-foreground">Escolhidas pelos moradores nas melhores avaliações.</p>
          </div>
          <Link to="/buscar" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver tudo <ArrowRight className="h-4 w-4" />
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
              <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">Sua empresa nesta lista</h3>
              <p className="mt-2 max-w-xl text-white/95">
                Cadastro grátis em 2 minutos, sem cartão. Apareça para quem já procura seu serviço em {cityName} e receba contatos direto no WhatsApp.
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
