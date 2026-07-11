import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CompanyCard, toCompanyCardData } from "@/components/site/CompanyCard";
import { fetchCities, searchCompanies } from "@/lib/queries";

export const Route = createFileRoute("/cidades/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Serviços em ${params.slug} — AgendaAqui` },
      { name: "description", content: `Empresas e profissionais verificados em ${params.slug}.` },
      { property: "og:url", content: `/cidades/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/cidades/${params.slug}` }],
  }),
  component: CityPage,
});

function CityPage() {
  const { slug } = Route.useParams();
  const cities = useQuery({ queryKey: ["cities"], queryFn: fetchCities });
  const city = cities.data?.find((c) => c.slug === slug);
  const results = useQuery({
    queryKey: ["search", "", slug, ""],
    queryFn: () => searchCompanies({ city: slug }),
  });

  if (cities.isSuccess && !city) throw notFound();

  return (
    <SiteLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-12 text-primary-foreground">
        <div className="container mx-auto px-4">
          <p className="text-sm text-white/80">Cidade</p>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{city?.name ?? slug}</h1>
          <p className="mt-1 text-white/85">Encontre profissionais e empresas verificadas em {city?.name ?? slug}.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {results.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (results.data?.items ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-lg font-semibold">Nenhuma empresa nesta cidade ainda</p>
            <Link to="/buscar" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Ver todas as empresas
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(results.data?.items ?? []).map((co) => (
              <CompanyCard key={co.id} company={toCompanyCardData(co)} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
