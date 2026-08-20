import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Newspaper, ArrowRight } from "lucide-react";
import { useSelectedCity, CITY_OPTIONS } from "@/hooks/useSelectedCity";
import { fetchBlogPosts, type BlogPostRow } from "@/lib/blog";

interface Props {
  limit?: number;
  title?: string;
}

/** Normaliza texto para comparação (remove acentos e caixa). */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Seleciona posts que citam a cidade; se não houver, cai para os mais recentes. */
function selectCityPosts(posts: BlogPostRow[], cityName: string, limit: number): BlogPostRow[] {
  const needle = normalize(cityName);
  const matches = posts.filter((p) => {
    const haystack = normalize(
      [p.title, p.excerpt ?? "", p.meta_description ?? "", (p.keywords ?? []).join(" ")].join(" "),
    );
    return haystack.includes(needle);
  });
  return (matches.length > 0 ? matches : posts).slice(0, limit);
}

export function CityNewsWidget({ limit = 5, title }: Props) {
  const { city } = useSelectedCity();
  const cityName = CITY_OPTIONS.find((c) => c.slug === city)?.name ?? city;

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts-city-widget"],
    queryFn: () => fetchBlogPosts(),
    staleTime: 120_000,
  });

  const posts = selectCityPosts(data ?? [], String(cityName ?? ""), limit);

  if (!isLoading && posts.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Newspaper className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {title ?? `Últimas notícias de ${cityName}`}
          </h2>
        </div>
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver tudo <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="group flex gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-accent/40"
            >
              {post.cover_url ? (
                <img
                  src={post.cover_url}
                  alt=""
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-lg"
                >
                  📰
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {post.category_name ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                      {post.category_name}
                    </span>
                  ) : null}
                  {post.published_at ? (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.published_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  ) : null}
                </div>
                <h3 className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
                  {post.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
