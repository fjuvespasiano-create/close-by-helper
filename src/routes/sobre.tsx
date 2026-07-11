import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — AgendaAqui" },
      { name: "description", content: "Conheça o AgendaAqui, marketplace regional de serviços e empresas em Minas Gerais." },
      { property: "og:url", content: "/sobre" },
    ],
    links: [{ rel: "canonical", href: "/sobre" }],
  }),
  component: SobrePage,
});

function SobrePage() {
  const c = useSiteContent().about;
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{c.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{c.subtitle}</p>
        <div className="prose mt-6 max-w-none text-foreground/90">
          <p>{c.p1}</p>
          <p className="mt-4">{c.p2}</p>
          <p className="mt-4">{c.p3}</p>
        </div>
      </div>
    </SiteLayout>
  );
}
