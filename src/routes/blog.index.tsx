import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Newspaper, PenLine } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchBlogPosts, fetchBlogCategories } from "@/lib/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Notícias & Blog AgenddaAqui — Vespasiano e São José da Lapa" },
      { name: "description", content: "Notícias, dicas e novidades sobre serviços, cidade, negócios e cultura em Vespasiano e São José da Lapa." },
      { property: "og:title", content: "Notícias & Blog AgenddaAqui" },
      { property: "og:description", content: "Fique por dentro das novidades da sua cidade." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

type Filter = { type: "" | "news" | "blog"; category: string };

function BlogPage() {
  const [filter, setFilter] = useState<Filter>({ type: "", category: "" });
  const categories = useQuery({ queryKey: ["blog-categories"], queryFn: fetchBlogCategories });
  const posts = useQuery({
    queryKey: ["blog-posts", filter],
    queryFn: () =>
      fetchBlogPosts({
        categorySlug: filter.category || null,
        type: filter.type || null,
      }),
  });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (posts.data ?? []).forEach((p) => {
      if (p.category_slug) map.set(p.category_slug, (map.get(p.category_slug) ?? 0) + 1);
    });
    return map;
  }, [posts.data]);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-gradient-to-b from-surface to-background">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <Newspaper className="h-4 w-4" /> Notícias & Blog
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">O que está acontecendo na sua cidade</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Notícias locais, dicas de serviços e histórias de Vespasiano e São José da Lapa em um só lugar.
          </p>

          {/* Type toggle */}
          <div className="mt-6 inline-flex rounded-full border border-border bg-card p-1 text-sm">
            {([
              { v: "", label: "Tudo" },
              { v: "news", label: "Notícias", icon: Newspaper },
              { v: "blog", label: "Blog", icon: PenLine },
            ] as const).map((t) => {
              const active = filter.type === t.v;
              const Icon = "icon" in t ? t.icon : null;
              return (
                <button
                  key={t.v}
                  onClick={() => setFilter((f) => ({ ...f, type: t.v as Filter["type"] }))}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium transition ${
                    active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />} {t.label}
                </button>
              );
            })}
          </div>

          {/* Category chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter((f) => ({ ...f, category: "" }))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !filter.category
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas categorias
            </button>
            {(categories.data ?? []).map((c) => {
              const active = filter.category === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter((f) => ({ ...f, category: active ? "" : c.slug }))}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    active ? "text-white shadow" : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                  style={active && c.color ? { backgroundColor: c.color, borderColor: c.color } : undefined}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? "rgba(255,255,255,0.9)" : c.color ?? "#94a3b8" }}
                  />
                  {c.name}
                  {counts.get(c.slug) ? <span className="opacity-70">· {counts.get(c.slug)}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {posts.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !posts.data?.length ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Nenhum conteúdo encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.data.map((p) => (
              <Link
                key={p.id}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {p.cover_url && (
                    <img
                      src={p.cover_url}
                      alt={p.title ?? ""}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {p.post_type === "news" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                        <Newspaper className="h-3 w-3" /> Notícia
                      </span>
                    )}
                    {p.post_type === "blog" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                        <PenLine className="h-3 w-3" /> Blog
                      </span>
                    )}
                    {p.category_name && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                        style={{ backgroundColor: p.category_color ?? "#334155" }}
                      >
                        {p.category_name}
                      </span>
                    )}
                  </div>
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
