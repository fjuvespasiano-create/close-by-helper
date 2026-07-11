import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, BadgeCheck, Lock, Search, FileCheck2, Phone, Star, AlertTriangle, MessageSquare, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/reputacao")({
  head: () => ({
    meta: [
      { title: "Reputação AgendaAqui — Como verificamos as empresas" },
      { name: "description", content: "Entenda como o AgendaAqui verifica empresas, quais informações são checadas e as medidas de segurança que protegem sua busca por serviços." },
      { property: "og:title", content: "Reputação AgendaAqui — Empresas verificadas" },
      { property: "og:description", content: "Selo Verificado, checagem de identidade, moderação de avaliações e segurança de dados na AgendaAqui." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReputationPage,
});

function ReputationPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-background p-8 md:p-14">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative">
          <Badge className="mb-4 bg-accent/15 text-accent hover:bg-accent/20">Reputação AgendaAqui</Badge>
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl">
            Empresas verificadas.<br />Escolhas com confiança.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            A opção <strong>Reputação AgendaAqui</strong> é o nosso processo de verificação e curadoria
            que ajuda você a contratar prestadores de serviço com mais segurança em São José da Lapa,
            Vespasiano e região.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/buscar">Buscar empresas verificadas</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/planos">Sou empresa — quero verificar</Link></Button>
          </div>
        </div>
      </div>

      {/* O que é o selo */}
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <BadgeCheck className="h-8 w-8 text-accent" />
          <h2 className="mt-3 font-display text-xl font-bold">O que é o selo Verificado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O selo <strong>Verificado</strong> é atribuído a empresas que concluíram nossa checagem de
            identidade, contato e atuação. Ele aparece no cartão da empresa nas buscas e no perfil público.
          </p>
        </Card>
        <Card className="p-6">
          <ShieldCheck className="h-8 w-8 text-accent" />
          <h2 className="mt-3 font-display text-xl font-bold">Por que isso importa</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reduz risco de golpes, perfis duplicados e informações falsas. Você contrata sabendo que
            a empresa existe de verdade, atende no local anunciado e responde pelo que oferece.
          </p>
        </Card>
      </section>

      {/* Processo passo a passo */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold md:text-3xl">Como verificamos, passo a passo</h2>
        <p className="mt-2 text-muted-foreground">Nossa equipe segue quatro etapas para cada empresa cadastrada.</p>

        <ol className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { icon: Building2, title: "1. Cadastro completo", desc: "A empresa preenche razão social/CNPJ ou MEI, endereço, categoria e responsável. Dados incompletos não avançam." },
            { icon: Phone, title: "2. Contato confirmado", desc: "Validamos telefone e WhatsApp por chamada ou mensagem, e conferimos e-mail e canais oficiais." },
            { icon: FileCheck2, title: "3. Prova de atuação", desc: "Solicitamos comprovantes: foto de fachada, veículo com identificação, alvará, portfólio recente ou avaliações consistentes no Google." },
            { icon: Search, title: "4. Checagem cruzada", desc: "Comparamos endereço no mapa, presença em Google Meu Negócio e redes sociais e histórico de reclamações públicas." },
          ].map((s, i) => (
            <li key={i}>
              <Card className="h-full p-6">
                <s.icon className="h-7 w-7 text-accent" />
                <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-xs text-muted-foreground">
          Empresas do plano Premium recebem o selo Verificado após concluir todas as etapas acima.
          O selo pode ser suspenso a qualquer momento se detectarmos informações desatualizadas ou
          denúncias procedentes.
        </p>
      </section>

      {/* O que verificamos */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold md:text-3xl">O que verificamos</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            "Identidade da empresa (CNPJ/MEI e responsável)",
            "Endereço físico e área de atendimento",
            "Telefone e WhatsApp ativos",
            "Categoria de serviço e especialidades",
            "Fotos reais do estabelecimento e portfólio",
            "Consistência com Google Meu Negócio",
            "Avaliações públicas dos clientes",
            "Reclamações e histórico público",
            "Atualização periódica dos dados",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-lg border border-border/60 bg-surface/40 p-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Segurança de dados */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold md:text-3xl">Segurança dos seus dados</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <Lock className="h-7 w-7 text-accent" />
            <h3 className="mt-3 font-display text-lg font-bold">Criptografia em trânsito</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo o site é servido em HTTPS. Suas buscas, mensagens e login trafegam criptografados.
            </p>
          </Card>
          <Card className="p-6">
            <ShieldCheck className="h-7 w-7 text-accent" />
            <h3 className="mt-3 font-display text-lg font-bold">Acesso restrito</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Contas seguem o princípio do menor privilégio. Somente a equipe de verificação acessa
              documentos enviados pelas empresas, e apenas durante a análise.
            </p>
          </Card>
          <Card className="p-6">
            <MessageSquare className="h-7 w-7 text-accent" />
            <h3 className="mt-3 font-display text-lg font-bold">Moderação de avaliações</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Avaliações passam por moderação para remover conteúdo ofensivo, spam ou falso. Empresas
              podem responder publicamente às avaliações recebidas.
            </p>
          </Card>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Esta página é mantida pela equipe do AgendaAqui e descreve práticas atuais da plataforma.
          Não constitui certificação por terceiros. Para saber como tratamos dados pessoais, consulte
          nossa política de privacidade.
        </p>
      </section>

      {/* Denúncias */}
      <section className="mt-14">
        <Card className="border-accent/40 bg-accent/5 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-8 w-8 shrink-0 text-accent" />
            <div>
              <h2 className="font-display text-xl font-bold md:text-2xl">Viu algo errado? Nos avise.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Se uma empresa desrespeitar as regras, tiver dados falsos ou aplicar golpe, denuncie
                pelo botão do perfil ou fale com a equipe. Investigamos cada relato e podemos suspender
                o selo Verificado ou remover o anúncio.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild><Link to="/contato">Falar com o AgendaAqui</Link></Button>
                <Button asChild variant="outline"><Link to="/emergencia">Emergências</Link></Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Testemunho / prova social */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold md:text-3xl">Empresas que valorizam a verificação</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-1 text-accent">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-3 text-sm italic text-muted-foreground">
              "Depois que ganhamos o selo Verificado, os clientes chegam mais confiantes.
              Fecham serviço já no primeiro contato."
            </p>
            <div className="mt-3 text-sm font-semibold">Auto Limpeza Pro</div>
            <div className="text-xs text-muted-foreground">Higienização de estofados — São José da Lapa</div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-1 text-accent">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-3 text-sm italic text-muted-foreground">
              "Achei uma empresa aqui pelo AgendaAqui, vi o selo, chamei pelo WhatsApp e deu tudo certo.
              Bem melhor do que sair procurando no grupo do bairro."
            </p>
            <div className="mt-3 text-sm font-semibold">Mariana R.</div>
            <div className="text-xs text-muted-foreground">Cliente — Vespasiano</div>
          </Card>
        </div>
      </section>

      {/* CTA final */}
      <section className="mt-14 rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-accent/10 p-8 text-center md:p-12">
        <h2 className="font-display text-2xl font-extrabold md:text-3xl">Pronto para contratar com segurança?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Filtre pelo selo Verificado, leia avaliações reais e fale direto com a empresa pelo WhatsApp.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to="/buscar">Buscar serviços agora</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/planos">Verificar minha empresa</Link></Button>
        </div>
      </section>
    </div>
  );
}
