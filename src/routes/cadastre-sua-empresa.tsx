import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Gift,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const SITE = "https://close-by-helper.lovable.app";

export const Route = createFileRoute("/cadastre-sua-empresa")({
  head: () => ({
    meta: [
      { title: "Cadastre grátis seu perfil e sua empresa — AgenddaAqui" },
      {
        name: "description",
        content:
          "Em menos de 2 minutos: crie sua conta, monte seu perfil e publique sua empresa em Vespasiano e São José da Lapa. Grátis, sem cartão, sem taxa — e você começa a receber clientes hoje mesmo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Cadastre grátis seu perfil e sua empresa" },
      {
        property: "og:description",
        content:
          "Perfil de visitante + página de empresa em minutos. WhatsApp, avaliações e localização — tudo em um só lugar.",
      },
      { property: "og:url", content: `${SITE}/cadastre-sua-empresa` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cadastre grátis seu perfil e sua empresa" },
      {
        name: "twitter:description",
        content:
          "Perfil de visitante + página de empresa em minutos. Comece a aparecer para quem procura seus serviços.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE}/cadastre-sua-empresa` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Cadastre grátis seu perfil e sua empresa",
          url: `${SITE}/cadastre-sua-empresa`,
          description:
            "Landing para visitantes criarem conta e cadastrarem sua empresa no AgenddaAqui.",
        }),
      },
    ],
  }),
  component: CadastreSuaEmpresa,
});

function CadastreSuaEmpresa() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const primaryHref = isAuthed ? "/painel/empresas/nova" : "/auth";
  const primarySearch = (isAuthed ? undefined : { redirect: "/painel/empresas/nova" }) as never;
  const secondaryHref = isAuthed ? "/painel/perfil" : "/auth";
  const secondarySearch = (isAuthed ? undefined : { redirect: "/painel/perfil" }) as never;

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground/90">
              <Sparkles className="h-3.5 w-3.5" /> Grátis · sem cartão · sem taxa
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight md:text-5xl">
              Cadastre <span className="text-primary">seu perfil</span> e coloque sua
              <span className="text-accent"> empresa no mapa</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
              Em menos de 2 minutos você cria sua conta, monta seu perfil e publica sua empresa em
              Vespasiano e São José da Lapa — pronta para receber contatos direto no seu WhatsApp.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={primaryHref} search={primarySearch}>
                <Button size="lg" className="btn-shine press-scale gap-2 rounded-full px-6">
                  <Building2 className="h-5 w-5" /> Cadastrar minha empresa grátis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={secondaryHref} search={secondarySearch}>
                <Button size="lg" variant="outline" className="gap-2 rounded-full px-6">
                  <UserPlus className="h-5 w-5" /> Só criar meu perfil
                </Button>
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {[
                "Sem instalar app",
                "Aprovação rápida",
                "Você controla tudo",
                "Cancela quando quiser",
              ].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Mini "prova" ao lado */}
          <div className="relative">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Star className="h-6 w-6 fill-current" />
                </div>
                <div>
                  <p className="text-sm font-semibold">O que os comerciantes ganham</p>
                  <p className="text-xs text-muted-foreground">Recursos inclusos no plano grátis</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  { icon: MessageCircle, t: "Botão de WhatsApp direto no seu perfil" },
                  { icon: Star, t: "Avaliações e reputação dos seus clientes" },
                  { icon: Gift, t: "Cupons e promoções para atrair novos clientes" },
                  { icon: ShieldCheck, t: "Selo de empresa verificada" },
                ].map(({ icon: Icon, t }) => (
                  <li key={t} className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link to="/planos" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver planos Premium <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PASSOS */}
      <section className="container mx-auto px-4 py-14">
        <h2 className="text-center font-display text-2xl font-bold md:text-3xl">Como funciona</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          Três passos simples. Sem burocracia, sem letras miúdas.
        </p>

        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: UserPlus,
              step: "01",
              title: "Crie sua conta",
              desc: "Com Google ou e-mail. Leva 30 segundos.",
              cta: { href: isAuthed ? "/painel/perfil" : "/auth", label: "Criar conta" },
            },
            {
              icon: Building2,
              step: "02",
              title: "Cadastre sua empresa",
              desc: "Nome, cidade, WhatsApp e categoria. Pronto.",
              cta: { href: primaryHref, label: "Cadastrar empresa" },
            },
            {
              icon: Rocket,
              step: "03",
              title: "Comece a receber clientes",
              desc: "Seu perfil aparece para quem já procura o que você faz.",
              cta: { href: "/", label: "Ver a home" },
            },
          ].map((s) => (
            <li key={s.step} className="group relative rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <span className="absolute right-4 top-3 font-display text-4xl font-black text-muted-foreground/15">
                {s.step}
              </span>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              <Link
                to={s.cta.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {s.cta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ curta */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto grid gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Perguntas rápidas</h2>
            <p className="mt-2 text-muted-foreground">
              Se ficar qualquer dúvida, é só falar com a gente pelo botão de contato do site.
            </p>
          </div>
          <dl className="space-y-4">
            {[
              {
                q: "Preciso pagar algo para cadastrar?",
                a: "Não. O cadastro do perfil e da empresa é 100% grátis. Você só paga se quiser destacar sua empresa com o plano Premium.",
              },
              {
                q: "Quem aprova minha empresa?",
                a: "Nossa equipe revisa em até 24h úteis para garantir que os dados estão corretos. Você recebe uma notificação assim que estiver publicada.",
              },
              {
                q: "Posso editar depois?",
                a: "Sim. Todo o conteúdo da sua empresa (fotos, descrição, horários, contatos) pode ser alterado quando quiser no seu painel.",
              },
              {
                q: "E se minha empresa já estiver no site?",
                a: "Você pode reivindicar a página oficial no botão 'É minha empresa' e assumir o controle dela.",
              },
            ].map((f) => (
              <div key={f.q} className="rounded-xl border border-border bg-card p-4">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto px-4 py-14">
        <div className="rounded-3xl bg-gradient-to-r from-primary to-primary-dark p-8 text-center text-primary-foreground md:p-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            Sua próxima venda pode estar te procurando agora.
          </h2>
          <p className="mx-auto mt-2 max-w-xl opacity-90">
            Cadastre-se grátis e apareça para quem já está pronto para comprar na sua região.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to={primaryHref} search={primarySearch}>
              <Button size="lg" variant="secondary" className="gap-2 rounded-full px-6">
                <Building2 className="h-5 w-5" /> Cadastrar minha empresa
              </Button>
            </Link>
            <Link to="/planos">
              <Button size="lg" variant="outline" className="gap-2 rounded-full border-white/40 bg-transparent px-6 text-primary-foreground hover:bg-white/10">
                Ver planos
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
