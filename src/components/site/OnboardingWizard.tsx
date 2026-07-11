import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, MapPin, Search, Heart, Bell, ArrowRight, ArrowLeft, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "asp:onboarding-v1";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  highlight?: string;
  cta?: { label: string; to: string };
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao Ache Serviço Perto!",
    description:
      "Encontre em segundos os melhores prestadores e comércios da sua cidade. Tudo verificado, com avaliações reais de quem mora aqui.",
    highlight: "1.172 empresas ativas",
  },
  {
    icon: MapPin,
    title: "Escolha sua cidade",
    description:
      "Definimos automaticamente a cidade pela sua localização. Você pode trocar a qualquer momento pelo seletor no topo da página.",
    highlight: "Vespasiano · São José da Lapa",
  },
  {
    icon: Search,
    title: "Busque por serviço ou categoria",
    description:
      "Use a barra de busca da home para encontrar rapidamente pelo tipo de serviço, ou explore as categorias organizadas.",
    cta: { label: "Explorar categorias", to: "/" },
  },
  {
    icon: Heart,
    title: "Favorite e compare",
    description:
      "Salve empresas nos favoritos, veja fotos, horários, avaliações e peça orçamento direto pelo WhatsApp.",
    cta: { label: "Ver favoritos", to: "/favoritos" },
  },
  {
    icon: Bell,
    title: "Ative as notificações",
    description:
      "Receba alertas de promoções, eventos e serviços de emergência da sua cidade. É opcional e você controla tudo.",
  },
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setOpen(true), 900);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const close = (completed: boolean) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ completed, at: new Date().toISOString(), step }),
      );
    } catch {}
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <button
        type="button"
        aria-label="Fechar tutorial"
        onClick={() => close(false)}
        className="absolute inset-0 bg-foreground/70 backdrop-blur-sm animate-in fade-in duration-300"
      />

      <div className="relative w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-border animate-in fade-in zoom-in-95 duration-300 sm:p-8">
        <button
          type="button"
          onClick={() => close(false)}
          aria-label="Pular tutorial"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="mb-6 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Ir para o passo ${i + 1}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                i === step
                  ? "bg-primary"
                  : i < step
                    ? "bg-primary/50"
                    : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="h-7 w-7" />
        </div>

        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Passo {step + 1} de {STEPS.length}
        </div>

        <h2
          id="onboarding-title"
          className="text-2xl font-black tracking-tight text-foreground sm:text-3xl"
        >
          {current.title}
        </h2>

        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {current.description}
        </p>

        {current.highlight && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-primary/20">
            <Check className="h-3.5 w-3.5" />
            {current.highlight}
          </div>
        )}

        {current.cta && (
          <div className="mt-4">
            <Link
              to={current.cta.to}
              onClick={() => close(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {current.cta.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (isFirst ? close(false) : setStep((s) => s - 1))}
          >
            {isFirst ? (
              "Pular"
            ) : (
              <>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => (isLast ? close(true) : setStep((s) => s + 1))}
            className="min-w-[120px]"
          >
            {isLast ? (
              <>
                Começar
                <Check className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Próximo
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  } catch {}
}
