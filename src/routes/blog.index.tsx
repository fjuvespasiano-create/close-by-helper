import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchBlogPosts } from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog AgendaAqui — Dicas e novidades sobre serviços locais" },
      { name: "description", content: "Artigos sobre empresas, serviços e profissionais em Minas Gerais." },
      { property: "og:title", content: "Blog AgendaAqui" },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

function BlogPage() {
  const posts = useQuery({ queryKey: ["blog-posts"], queryFn: fetchBlogPosts });

  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-12">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Blog AgendaAqui</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Dicas, novidades e histórias sobre serviços locais em Minas Gerais.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {posts.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(posts.data ?? []).map((p) => (
              <Link
                key={p.id ?? p.slug ?? ""}
                to="/blog/$slug"
                params={{ slug: p.slug ?? "" }}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {p.cover_url && (
                    <img src={p.cover_url} alt={p.title ?? ""} loading="lazy" decoding="async"

                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : ""}
                    {p.author_name && <span>· {p.author_name}</span>}

                  </div>
                  <h2 className="font-display text-lg font-bold leading-tight group-hover:text-primary">{p.title}</h2>
                  {p.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
