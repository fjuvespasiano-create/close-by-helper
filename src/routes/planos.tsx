import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Star, Crown, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Anuncie sua empresa grátis — AgendaAqui" },
      { name: "description", content: "Apareça para quem já procura seu serviço em Vespasiano e São José da Lapa. Cadastro em 2 minutos, sem cartão, sem fidelidade. Contatos direto no seu WhatsApp." },
      { property: "og:title", content: "Apareça no app da cidade — AgendaAqui" },
      { property: "og:url", content: "/planos" },
    ],
    links: [{ rel: "canonical", href: "/planos" }],
  }),
  component: PlanosPage,
});

const PLANS = [
  {
    id: "basico",
    name: "Grátis",
    price: "R$ 0",
    priceSuffix: "para sempre",
    subtitle: "Comece a receber contatos hoje mesmo",
    cta: "Criar meu perfil grátis",
    icon: Star,
    accent: false,
    features: [
      "Seu perfil no app oficial da cidade",
      "Até 3 fotos do seu trabalho",
      "Até 2 categorias e 2 projetos",
      "Até 3 perguntas frequentes",
      "Botão de WhatsApp e ligação com 1 toque",
      "Avaliações de clientes reais, sem moderação suspeita",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 149",
    priceSuffix: "/mês",
    subtitle: "Mais visibilidade, mais confiança, mais contatos",
    cta: "Quero ser Premium",
    icon: Crown,
    accent: true,
    features: [
      "Selo Verificado — o cliente confia antes de ligar",
      "Selos Top atendimento, Especialista e Entrega garantida",
      "Prioridade na busca e destaque na home da cidade",
      "Fotos, projetos, categorias e FAQs ilimitados",
      "Banner personalizado no topo do seu perfil",
      "Relatórios de visitas, cliques e origem dos contatos",
      "Consultor dedicado no seu WhatsApp",
      "Card destacado nas listagens (fica na frente da concorrência)",
    ],
  },
] as const;


const schema = z.object({
  company_name: z.string().trim().min(1).max(200),
  contact_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional(),
  city: z.string().trim().max(120).optional(),
  message: z.string().trim().max(1000).optional(),
});

function PlanosPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_name: "", email: "", phone: "", city: "", message: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!open) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setLoading(true);
    const { error } = await supabase.from("leads_planos").insert({
      ...parsed.data,
      plan: open,
    });
    setLoading(false);
    if (error) { toast.error("Não conseguimos enviar agora. Tente de novo em instantes."); return; }
    toast.success("Recebido! Nossa equipe entra em contato em até 24h.");
    setOpen(null);
    setForm({ company_name: "", contact_name: "", email: "", phone: "", city: "", message: "" });
  }

  return (
    <SiteLayout>
      {/* Scoped high-impact styles — uses design tokens only */}
      <style>{`
        @keyframes planos-fade-up { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes planos-hero-blob { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(30px,-20px) scale(1.08);} }
        @keyframes planos-gradient-shift { 0%,100% { background-position: 0% 50%;} 50% { background-position: 100% 50%;} }
        @keyframes planos-shine { 0% { transform: translateX(-120%) skewX(-20deg);} 100% { transform: translateX(220%) skewX(-20deg);} }
        @keyframes planos-crown-float { 0%,100% { transform: translateY(0) rotate(-2deg);} 50% { transform: translateY(-4px) rotate(2deg);} }
        @keyframes planos-badge-pulse { 0%,100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--accent) 55%, transparent);} 50% { box-shadow: 0 0 0 10px color-mix(in oklab, var(--accent) 0%, transparent);} }

        .planos-fade { opacity: 0; animation: planos-fade-up .7s cubic-bezier(.22,.61,.36,1) forwards; }
        .planos-hero { position: relative; overflow: hidden; }
        .planos-hero::before, .planos-hero::after {
          content: ""; position: absolute; border-radius: 9999px; filter: blur(60px);
          pointer-events: none; opacity: .35; will-change: transform;
        }
        .planos-hero::before { width: 420px; height: 420px; background: var(--accent); top: -140px; left: -80px; animation: planos-hero-blob 12s ease-in-out infinite; }
        .planos-hero::after { width: 380px; height: 380px; background: color-mix(in oklab, var(--primary-foreground) 35%, transparent); bottom: -160px; right: -60px; animation: planos-hero-blob 14s ease-in-out infinite reverse; }

        .planos-card { position: relative; transition: transform .45s cubic-bezier(.22,.61,.36,1), box-shadow .45s ease, border-color .3s ease; }
        .planos-card:hover { transform: translateY(-8px); }
        .planos-card--free:hover { box-shadow: 0 20px 45px -25px color-mix(in oklab, var(--primary) 35%, transparent); border-color: color-mix(in oklab, var(--primary) 40%, transparent); }

        .planos-card--premium { background:
          linear-gradient(var(--card), var(--card)) padding-box,
          linear-gradient(120deg, var(--accent), var(--primary), var(--accent)) border-box;
          background-size: 100% 100%, 220% 220%;
          border: 2px solid transparent;
          animation: planos-gradient-shift 8s ease infinite;
        }
        .planos-card--premium:hover { box-shadow: 0 30px 60px -25px color-mix(in oklab, var(--accent) 55%, transparent); }
        .planos-card--premium::after {
          content: ""; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
          background: radial-gradient(600px circle at var(--mx,50%) var(--my,0%), color-mix(in oklab, var(--accent) 18%, transparent), transparent 40%);
          opacity: 0; transition: opacity .4s ease;
        }
        .planos-card--premium:hover::after { opacity: 1; }

        .planos-badge { animation: planos-badge-pulse 2.4s ease-in-out infinite; }
        .planos-crown { animation: planos-crown-float 3.2s ease-in-out infinite; transform-origin: center; }

        .planos-feature { opacity: 0; animation: planos-fade-up .5s ease forwards; }
        .planos-check { display: inline-flex; align-items: center; justify-content: center; height: 20px; width: 20px; border-radius: 9999px; background: color-mix(in oklab, var(--primary) 12%, transparent); color: var(--primary); transition: transform .25s ease, background .25s ease; flex-shrink: 0; margin-top: 2px; }
        .planos-card--premium .planos-check { background: color-mix(in oklab, var(--accent) 18%, transparent); color: var(--accent); }
        .planos-feature:hover .planos-check { transform: scale(1.15) rotate(-6deg); }

        .planos-btn-shine { position: relative; overflow: hidden; transition: transform .25s ease, box-shadow .3s ease; }
        .planos-btn-shine:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -12px color-mix(in oklab, var(--primary) 50%, transparent); }
        .planos-btn-shine::before {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary-foreground) 35%, transparent), transparent);
          transform: translateX(-120%) skewX(-20deg); pointer-events: none;
        }
        .planos-btn-shine:hover::before { animation: planos-shine .9s ease forwards; }
        .planos-card--premium .planos-btn-shine:hover { box-shadow: 0 14px 32px -12px color-mix(in oklab, var(--accent) 60%, transparent); }

        @media (prefers-reduced-motion: reduce) {
          .planos-fade, .planos-feature, .planos-badge, .planos-crown, .planos-hero::before, .planos-hero::after, .planos-card--premium { animation: none !important; opacity: 1 !important; }
          .planos-card:hover { transform: none; }
        }
      `}</style>


      <section className="planos-hero border-b border-border bg-gradient-to-br from-primary via-primary to-primary-dark text-primary-foreground">
        <div className="container relative z-10 mx-auto px-4 py-16 text-center sm:py-20">
          <span className="planos-fade inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ring-1 ring-white/25 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Para donos de empresa
          </span>
          <h1 className="planos-fade mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl" style={{ animationDelay: ".08s" }}>
            Apareça para quem já quer contratar hoje
          </h1>
          <p className="planos-fade mx-auto mt-4 max-w-2xl text-base text-white/90 md:text-lg" style={{ animationDelay: ".16s" }}>
            Todos os dias, vizinhos de Vespasiano e São José da Lapa entram no AgendaAqui para achar quem resolve. Escolha como quer aparecer — o cadastro leva 2 minutos e é grátis.
          </p>
          <div className="planos-fade mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-white/85" style={{ animationDelay: ".24s" }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20"><ShieldCheck className="h-3.5 w-3.5" /> Sem cartão</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20"><ShieldCheck className="h-3.5 w-3.5" /> Sem fidelidade</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20"><ShieldCheck className="h-3.5 w-3.5" /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 md:py-16">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {PLANS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`planos-card planos-fade group relative flex flex-col overflow-hidden rounded-2xl p-6 sm:p-7 ${p.accent ? "planos-card--premium shadow-xl" : "planos-card--free border border-border bg-card shadow-sm"}`}
                style={{ animationDelay: `${0.15 + idx * 0.1}s` }}
                onMouseMove={(e) => {
                  if (!p.accent) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
                }}
              >
                {p.accent && (
                  <div className="planos-badge mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                    <Sparkles className="h-3 w-3" /> Mais popular
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${p.accent ? "bg-accent/15" : "bg-primary/10"}`}>
                    <Icon className={`h-6 w-6 ${p.accent ? "planos-crown text-accent" : "text-primary"}`} />
                  </div>
                  <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{p.subtitle}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold tracking-tight ${p.accent ? "bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent" : ""}`}>{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.priceSuffix}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.features.map((f, i) => (
                    <li
                      key={f}
                      className="planos-feature flex items-start gap-2.5"
                      style={{ animationDelay: `${0.35 + idx * 0.1 + i * 0.05}s` }}
                    >
                      <span className="planos-check"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`planos-btn-shine mt-7 h-11 text-sm font-semibold ${p.accent ? "bg-accent text-accent-foreground hover:bg-accent" : ""}`}
                  variant={p.accent ? "default" : "outline"}
                  onClick={() => setOpen(p.id)}
                >
                  {p.cta}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="planos-fade mt-10 text-center text-sm text-muted-foreground" style={{ animationDelay: ".6s" }}>
          Sem multa, sem fidelidade, sem letras miúdas. Cancele quando quiser, direto no painel.
        </p>
      </section>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plano {open && PLANS.find((p) => p.id === open)?.name} — vamos conversar</DialogTitle>
            <DialogDescription>Conta rapidinho sobre o seu negócio. A gente te chama no WhatsApp em até 24h úteis.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="company_name">Nome da sua empresa *</Label>
              <Input id="company_name" placeholder="Ex: Marcenaria Arte em Madeira" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} maxLength={200} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact_name">Seu nome *</Label>
                <Input id="contact_name" placeholder="Como te chamamos?" required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} maxLength={120} />
              </div>
              <div>
                <Label htmlFor="email">Seu melhor e-mail *</Label>
                <Input id="email" type="email" placeholder="voce@exemplo.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">WhatsApp</Label>
                <Input id="phone" placeholder="(31) 9 0000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
              </div>
              <div>
                <Label htmlFor="city">Sua cidade</Label>
                <Input id="city" placeholder="Vespasiano ou São José da Lapa" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={120} />
              </div>
            </div>
            <div>
              <Label htmlFor="message">Algo que devemos saber? (opcional)</Label>
              <Textarea id="message" placeholder="Conte um pouco do seu negócio ou o que espera do plano" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={1000} />
            </div>
            <Button type="submit" disabled={loading} className="planos-btn-shine w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Quero começar
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Sem compromisso. Sem cobrança automática.</p>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
