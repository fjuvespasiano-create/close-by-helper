import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Calendar, ChevronLeft } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchBlogPostBySlug } from "@/lib/blog";

const SITE = "https://ache-servico-perto.lovable.app";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await fetchBlogPostBySlug(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.post;
    const url = `${SITE}/blog/${params.slug}`;
    const title = p?.meta_title || p?.title || params.slug;
    const description = p?.meta_description || p?.excerpt || "Artigo do blog AgendaAqui.";
    const image = p?.og_image || p?.cover_url || undefined;
    const keywords = (p?.keywords ?? []).join(", ");
    const meta: Array<Record<string, string>> = [
      { title: `${title} — Blog AgendaAqui` },
      { name: "description", content: description },
      ...(keywords ? [{ name: "keywords", content: keywords }] : []),
      { property: "og:type", content: "article" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(image ? [
        { property: "og:image", content: image },
        { name: "twitter:image", content: image },
      ] : []),
      ...(p?.author_name ? [{ name: "author", content: p.author_name }] : []),
      ...(p?.published_at ? [{ property: "article:published_time", content: p.published_at }] : []),
    ];
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      image: image ? [image] : undefined,
      datePublished: p?.published_at ?? undefined,
      author: p?.author_name ? { "@type": "Person", name: p.author_name } : undefined,
      keywords: keywords || undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
  component: BlogPostPage,
});

function renderMarkdown(md: string) {
  const blocks = md.split(/\n\n+/);
  return blocks.map((b, i) => {
    if (b.startsWith("## ")) return <h2 key={i} className="mt-8 font-display text-2xl font-bold">{b.slice(3)}</h2>;
    if (b.startsWith("# ")) return <h1 key={i} className="mt-8 font-display text-3xl font-bold">{b.slice(2)}</h1>;
    if (b.startsWith("- ")) {
      return <ul key={i} className="mt-4 list-disc space-y-1 pl-6">{b.split("\n").map((l, j) => <li key={j}>{l.replace(/^- /, "")}</li>)}</ul>;
    }
    return <p key={i} className="mt-4 leading-relaxed text-foreground/90">{b}</p>;
  });
}

function BlogPostPage() {
  const { post: p } = Route.useLoaderData();

  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar ao blog
        </Link>
        <header className="mt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : ""}
            {p.author_name && <span>· {p.author_name}</span>}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{p.title}</h1>
          {p.excerpt && <p className="mt-3 text-lg text-muted-foreground">{p.excerpt}</p>}
        </header>
        {p.cover_url && (
          <img src={p.cover_url} alt={p.title ?? ""} className="mt-6 aspect-[16/9] w-full rounded-xl object-cover" />
        )}
        <div className="prose prose-slate mt-2 max-w-none">
          {renderMarkdown(p.content ?? "")}
        </div>
        {p.keywords && p.keywords.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {p.keywords.map((k: string) => (
              <span key={k} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">#{k}</span>
            ))}
          </div>
        )}
      </article>
    </SiteLayout>
  );
}
