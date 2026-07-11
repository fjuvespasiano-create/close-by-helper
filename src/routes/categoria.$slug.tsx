import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CompanyCard, toCompanyCardData } from "@/components/site/CompanyCard";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { categoriesQueryOptions, searchCompanies } from "@/lib/queries";

export const Route = createFileRoute("/categoria/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — AgendaAqui` },
      { name: "description", content: `Empresas e profissionais de ${params.slug} no AgendaAqui.` },
      { property: "og:url", content: `/categoria/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/categoria/${params.slug}` }],
  }),
  component: CategoryPage,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(categoriesQueryOptions);
  },
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const cats = useQuery(categoriesQueryOptions);
  const cat = cats.data?.find((c) => c.slug === slug);
  const results = useQuery({
    queryKey: ["search", "", "", slug],
    queryFn: () => searchCompanies({ category: slug }),
  });

  if (cats.isSuccess && !cat) throw notFound();

  return (
    <SiteLayout>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-12 text-primary-foreground">
        <div className="container mx-auto flex items-center gap-4 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <CategoryIcon name={cat?.icon} className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm text-white/80">Categoria</p>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{cat?.name ?? slug}</h1>
            {cat?.description ? <p className="mt-1 text-white/85">{cat.description}</p> : null}
          </div>
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
            <p className="text-lg font-semibold">Nenhuma empresa nesta categoria ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Volte em breve, novas empresas são cadastradas toda semana.</p>
            <Link to="/buscar" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Explorar outras categorias
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
