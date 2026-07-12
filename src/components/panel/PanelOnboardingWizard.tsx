import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, User, Building2, BadgePercent, Bell, ArrowRight, ArrowLeft, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta?: { label: string; to: string };
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao seu painel!",
    description:
      "Este é o seu centro de controle no AgenddaAqui. Aqui você gerencia suas empresas, promoções, avaliações e preferências em um só lugar.",
  },
  {
    icon: User,
    title: "Atualize seu perfil",
    description:
      "Comece completando seus dados: nome, foto, cidade e informações de contato. Um perfil completo passa mais confiança para clientes e melhora sua visibilidade.",
    cta: { label: "Ir para Meu perfil", to: "/painel/perfil" },
  },
  {
    icon: Building2,
    title: "Cadastre sua empresa",
    description:
      "Se você é comerciante, adicione sua empresa em ‘Minhas empresas’. Inclua fotos, horários, categorias e um bom texto de apresentação para atrair mais clientes.",
    cta: { label: "Minhas empresas", to: "/painel/empresas" },
  },
  {
    icon: BadgePercent,
    title: "Crie promoções e cupons",
    description:
      "Planos Premium e Destaque podem publicar promoções que aparecem na home e disparam notificações para moradores da cidade. Clientes adoram desconto!",
    cta: { label: "Ver promoções", to: "/painel/promocoes" },
  },
  {
    icon: Bell,
    title: "Ative notificações e você está pronto",
    description:
      "Configure alertas de novos leads, mensagens e avaliações em ‘Notificações’. Assim você nunca perde uma oportunidade.",
    cta: { label: "Preferências", to: "/painel/notificacoes/preferencias" },
  },
];

interface Props {
  userId: string;
}

export function PanelOnboardingWizard({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data && !data.onboarding_completed_at) {
        setOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function complete() {
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", userId);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in zoom-in-95">
        <button
          type="button"
          onClick={complete}
          aria-label="Fechar tour"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="px-6 pb-2 pt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Passo {step + 1} de {STEPS.length}
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 text-center sm:text-left">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 sm:mx-0">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.description}</p>

          {current.cta && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={async () => {
                await complete();
                navigate({ to: current.cta!.to });
              }}
            >
              {current.cta.label}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-6 py-4">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30",
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={complete} disabled={saving}>
                <Check className="mr-1 h-4 w-4" />
                Concluir
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Próximo
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
