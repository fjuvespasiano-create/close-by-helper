import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mountain,
  Users,
  UtensilsCrossed,
  Landmark,
  CalendarDays,
  Plane,
  MapPin,
  Sparkles,
  ArrowRight,
  Clock,
  Info,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/o-que-fazer")({
  head: () => ({
    meta: [
      { title: "O que fazer em São José da Lapa — Guia turístico completo" },
      {
        name: "description",
        content:
          "Descubra São José da Lapa (MG): parques, cachoeiras, gastronomia mineira, história, cultura e eventos. Guia prático com dica de logística (Confins e Cidade Administrativa).",
      },
      { property: "og:title", content: "O que fazer em São José da Lapa" },
      { property: "og:description", content: "Roteiros de lazer, gastronomia, história e eventos em São José da Lapa (MG)." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/o-que-fazer" }],
  }),
  component: OQueFazerPage,
});

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

type Attraction = {
  name: string;
  description: string;
  tag?: string;
  meta?: string;
};

type Section = {
  id: string;
  title: string;
  subtitle: string;
  icon: IconType;
  accent: string;
  items: Attraction[];
};

const SECTIONS: Section[] = [
  {
    id: "adrenalina",
    title: "Adrenalina e Esporte",
    subtitle: "Trilhas, escaladas e ecoturismo em meio à Serra do Cipó e formações cársticas",
    icon: Mountain,
    accent: "from-emerald-500 to-teal-600",
    items: [
      {
        name: "Gruta da Lapinha",
        description:
          "Uma das cavernas mais famosas de Minas, com salões amplos, formações calcárias e visita guiada. Fica a poucos minutos do centro, no distrito de Lapinha (Lagoa Santa/São José da Lapa).",
        tag: "Ecoturismo",
        meta: "≈ 15 min do centro",
      },
      {
        name: "Serra da Lapinha e mirantes",
        description:
          "Trilhas leves a moderadas com vista para os paredões calcários e o Vale do Rio das Velhas. Ideal para caminhadas ao amanhecer.",
        tag: "Trilha",
        meta: "Nível fácil/moderado",
      },
      {
        name: "Pesque-pagues da região",
        description:
          "Diversos pesqueiros familiares com estrutura para o dia todo, quiosques e peixe fresco preparado na hora.",
        tag: "Pesca esportiva",
      },
    ],
  },
  {
    id: "familia",
    title: "Família e Lazer",
    subtitle: "Parques, clubes e passeios para curtir com as crianças",
    icon: Users,
    accent: "from-sky-500 to-blue-600",
    items: [
      {
        name: "Parques aquáticos do entorno",
        description:
          "Vespasiano, Lagoa Santa e Confins concentram parques aquáticos e clubes de campo com day-use — a maioria a menos de 20 min de São José da Lapa.",
        tag: "Day-use",
      },
      {
        name: "Lagoa Central e praças",
        description:
          "Boa opção para uma tarde tranquila em família: caminhada, playground e lanchonetes locais.",
        tag: "Ao ar livre",
      },
      {
        name: "Parque Estadual do Sumidouro",
        description:
          "A poucos km, reúne arqueologia (sítios de Peter Lund), cavernas, lagoas e trilhas interpretativas. Ótimo bate-volta cultural e natureza.",
        tag: "Parque estadual",
        meta: "≈ 25 min",
      },
    ],
  },
  {
    id: "gastronomia",
    title: "Roteiro Gastronômico",
    subtitle: "Comida mineira de raiz, fogão a lenha e boteco de bairro",
    icon: UtensilsCrossed,
    accent: "from-orange-500 to-amber-600",
    items: [
      {
        name: "Restaurantes de fogão a lenha",
        description:
          "Frango com quiabo, tutu, feijão tropeiro e costelinha na pressão de lenha. Procure as casas familiares nas estradas vicinais — porção farta e preço honesto.",
        tag: "Comida mineira",
      },
      {
        name: "Pratos típicos para experimentar",
        description:
          "Pão de queijo quentinho, doce de leite artesanal, queijo canastra da região e cachaça de alambique. Muitos produtores vendem direto no varejo local.",
        tag: "Típico",
      },
      {
        name: "Botecos e petiscos",
        description:
          "Cerveja gelada, torresmo, linguiça artesanal e pastel de angu. Ótimo para começar a noite depois de um dia de trilha.",
        tag: "Boteco",
      },
    ],
  },
  {
    id: "historia",
    title: "História e Cultura",
    subtitle: "Igrejas centenárias, estação ferroviária e paisagens cársticas",
    icon: Landmark,
    accent: "from-violet-500 to-indigo-600",
    items: [
      {
        name: "Igreja Matriz de São José",
        description:
          "Centro histórico e religioso da cidade, referência das festas de padroeiro e ponto de encontro da comunidade.",
        tag: "Patrimônio",
      },
      {
        name: "Antiga Estação Ferroviária",
        description:
          "Marco da formação urbana ligada à antiga Estrada de Ferro Central do Brasil. Vale a foto e a caminhada pelo entorno.",
        tag: "Memória",
      },
      {
        name: "Formações calcárias e sítios de Lund",
        description:
          "A região faz parte do circuito de Peter Lund — grutas, dolinas e sítios paleontológicos que renderam descobertas de fósseis da megafauna.",
        tag: "Geológico",
      },
    ],
  },
  {
    id: "eventos",
    title: "Eventos Locais",
    subtitle: "Festas de padroeiro, festivais e agenda cultural",
    icon: CalendarDays,
    accent: "from-rose-500 to-pink-600",
    items: [
      {
        name: "Festa de São José",
        description:
          "Padroeiro da cidade, celebrado em março com missas, quermesse, barraquinhas e shows na praça.",
        meta: "Março",
      },
      {
        name: "Festa da Emancipação",
        description:
          "Aniversário da cidade com programação cultural, apresentações e comidas típicas.",
        meta: "Dezembro",
      },
      {
        name: "Agenda cultural e feiras",
        description:
          "Feiras de artesanato, encontros de motociclistas e eventos gastronômicos acontecem ao longo do ano — confira a agenda de eventos da cidade.",
      },
    ],
  },
];

function SectionCard({ section }: { section: Section }) {
  const Icon = section.icon;
  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${section.accent} text-white shadow-md`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold md:text-2xl">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">{section.subtitle}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => (
          <article
            key={item.name}
            className="group flex h-full flex-col rounded-2xl border border-border bg-background/60 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            {item.tag ? (
              <span className="mb-2 inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                {item.tag}
              </span>
            ) : null}
            <h3 className="font-display text-base font-bold text-foreground">{item.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            {item.meta ? (
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {item.meta}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function OQueFazerPage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="container relative mx-auto px-4 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ring-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Guia da cidade
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] md:text-5xl lg:text-6xl">
              O que fazer em{" "}
              <span className="bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
                São José da Lapa
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 md:text-lg">
              Cavernas, comida mineira de raiz, história e ecoturismo — a poucos minutos do Aeroporto de Confins.
              Um roteiro pra encaixar num fim de semana ou num bate-volta.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25"
                >
                  {s.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DICA DE OURO — LOGÍSTICA */}
      <section className="container mx-auto -mt-8 px-4 md:-mt-10">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-elevated md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Plane className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                <Sparkles className="h-3 w-3" /> Dica de ouro de logística
              </div>
              <h2 className="font-display text-lg font-bold text-amber-950 md:text-xl">
                A pouquíssimos minutos de Confins e da Cidade Administrativa
              </h2>
              <p className="mt-1.5 text-sm text-amber-950/85 md:text-base">
                São José da Lapa está a cerca de <strong>15 minutos do Aeroporto Internacional de Confins</strong> e a
                aproximadamente <strong>20 minutos da Cidade Administrativa de MG</strong>. É a base perfeita para
                quem chega de avião, para viagens de trabalho no Estado ou para uma parada estratégica antes de subir
                pra Serra do Cipó.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 font-medium text-amber-900">
                  <MapPin className="h-3 w-3" /> ≈ 15 min de Confins (CNF)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 font-medium text-amber-900">
                  <MapPin className="h-3 w-3" /> ≈ 20 min da Cidade Administrativa
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 font-medium text-amber-900">
                  <MapPin className="h-3 w-3" /> ≈ 40 min de Belo Horizonte
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÕES */}
      <div className="container mx-auto space-y-8 px-4 py-12 md:py-16">
        {SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}

        {/* DISCLAIMER */}
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Informações reunidas como guia introdutório. Horários, valores e funcionamento podem mudar — confirme
            diretamente com o estabelecimento antes de sair. Encontrou algo desatualizado?{" "}
            <Link to="/contato" className="font-medium text-primary hover:underline">
              Fale com a gente
            </Link>
            .
          </p>
        </div>
      </div>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-dark p-8 text-primary-foreground shadow-lg md:p-12">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">
                Explorou tudo? Veja quem atende na cidade
              </h3>
              <p className="mt-2 max-w-xl text-white/90">
                Restaurantes, pousadas, transporte e serviços de São José da Lapa e região — endereços, telefone e
                avaliações reais.
              </p>
            </div>
            <Link
              to="/buscar"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-semibold text-primary shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Ver empresas <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
