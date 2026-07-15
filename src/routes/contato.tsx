import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useSiteContent } from "@/lib/siteContent";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale com o AgenddaAqui — Contato" },
      { name: "description", content: "Tire dúvidas, envie sugestões ou fale com a equipe do AgenddaAqui por e-mail ou WhatsApp." },
      { property: "og:title", content: "Fale com o AgenddaAqui — Contato" },
      { property: "og:description", content: "E-mail e WhatsApp da equipe do AgenddaAqui para dúvidas e sugestões." },
      { property: "og:url", content: "https://close-by-helper.lovable.app/contato" },
    ],
    links: [{ rel: "canonical", href: "https://close-by-helper.lovable.app/contato" }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  const c = useSiteContent().contact;
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{c.title}</h1>
        <p className="mt-3 text-muted-foreground">{c.subtitle}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a href={`mailto:${c.email}`} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40">
            <Mail className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold">E-mail</h2>
            <p className="text-sm text-muted-foreground">{c.email}</p>
          </a>
          <a href={c.whatsapp_url} target="_blank" rel="noreferrer" className="rounded-xl border border-border bg-card p-6 hover:border-primary/40">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold">WhatsApp</h2>
            <p className="text-sm text-muted-foreground">{c.whatsapp_label}</p>
          </a>
        </div>
      </div>
    </SiteLayout>
  );
}
