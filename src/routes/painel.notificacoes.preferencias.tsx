import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getMyPreferences, savePreferences } from "@/lib/push.functions";
import { EnableNotifications } from "@/components/site/EnableNotifications";
import { fireHighAlertTest } from "@/lib/pwa";
import { BellRing } from "lucide-react";

export const Route = createFileRoute("/painel/notificacoes/preferencias")({
  head: () => ({ meta: [{ title: "Preferências de notificações — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: PrefsPage,
});

type Prefs = {
  promocoes: boolean; novidades: boolean; eventos: boolean; atualizacoes: boolean;
  empresas: boolean; blog: boolean; marketplace: boolean;
  som: boolean; vibracao: boolean;
  quiet_hours_enabled: boolean; quiet_start: number; quiet_end: number;
};

const DEFAULTS: Prefs = {
  promocoes: true, novidades: true, eventos: true, atualizacoes: true,
  empresas: true, blog: true, marketplace: true,
  som: true, vibracao: true,
  quiet_hours_enabled: false, quiet_start: 20, quiet_end: 8,
};

function PrefsPage() {
  const get = useServerFn(getMyPreferences);
  const save = useServerFn(savePreferences);
  const qc = useQueryClient();

  const { data } = useQuery({ queryKey: ["push-prefs"], queryFn: () => get({}) });
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    if (data) setPrefs({ ...DEFAULTS, ...(data as Partial<Prefs>) });
  }, [data]);

  const mut = useMutation({
    mutationFn: (p: Prefs) => save({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["push-prefs"] });
      toast.success("Preferências salvas.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const CATS: { key: keyof Prefs; label: string; desc: string; emoji: string }[] = [
    { key: "promocoes", label: "Promoções", desc: "Ofertas e descontos das empresas.", emoji: "🎉" },
    { key: "novidades", label: "Novidades", desc: "Recursos e melhorias do AgendaAqui.", emoji: "🚀" },
    { key: "eventos", label: "Eventos", desc: "Shows, festivais e agendas locais.", emoji: "📅" },
    { key: "atualizacoes", label: "Atualizações", desc: "Aviso quando algo que você segue muda.", emoji: "🔔" },
    { key: "empresas", label: "Empresas em destaque", desc: "Recomendações personalizadas.", emoji: "⭐" },
    { key: "blog", label: "Blog e notícias", desc: "Artigos e conteúdo regional.", emoji: "📰" },
    { key: "marketplace", label: "Marketplace", desc: "Anúncios e ofertas de produtos.", emoji: "🛒" },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Preferências de notificações</h1>
        <p className="text-sm text-muted-foreground">Escolha o que quer receber e quando.</p>
      </div>

      <EnableNotifications />

      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Categorias</h2>
        <div className="space-y-3">
          {CATS.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
              <div className="flex items-start gap-3">
                <span className="text-lg">{c.emoji}</span>
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
              </div>
              <Switch
                checked={prefs[c.key] as boolean}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, [c.key]: v }))}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Experiência</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 py-2">
            <div>
              <div className="font-medium">Som</div>
              <div className="text-xs text-muted-foreground">Toca um som ao chegar uma notificação.</div>
            </div>
            <Switch checked={prefs.som} onCheckedChange={(v) => setPrefs((p) => ({ ...p, som: v }))} />
          </div>
          <div className="flex items-center justify-between border-b border-border/60 py-2">
            <div>
              <div className="font-medium">Vibração</div>
              <div className="text-xs text-muted-foreground">Vibra no celular (quando suportado).</div>
            </div>
            <Switch checked={prefs.vibracao} onCheckedChange={(v) => setPrefs((p) => ({ ...p, vibracao: v }))} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-accent" /> Alerta crítico
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Testa uma notificação de alta prioridade com som forte, vibração intensa
              (padrão <code>[300,100,300,100,500]</code>) e que permanece na tela até ser dispensada.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              const r = await fireHighAlertTest();
              if (r === "denied") toast.error("Permissão de notificação negada.");
              else if (r === "unsupported") toast.error("Notificações não são suportadas neste navegador.");
              else toast.success("Alerta crítico disparado.");
            }}
          >
            Ativar notificações com alerta
          </Button>
        </div>
      </Card>

      <Card className="p-5">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Horário silencioso</h2>
            <p className="text-xs text-muted-foreground">Não receber nada em uma janela do dia.</p>
          </div>
          <Switch checked={prefs.quiet_hours_enabled} onCheckedChange={(v) => setPrefs((p) => ({ ...p, quiet_hours_enabled: v }))} />
        </div>
        {prefs.quiet_hours_enabled ? (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <Label>Silêncio a partir de</Label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefs.quiet_start} onChange={(e) => setPrefs((p) => ({ ...p, quiet_start: Number(e.target.value) }))}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
            <div>
              <Label>Voltar às</Label>
              <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={prefs.quiet_end} onChange={(e) => setPrefs((p) => ({ ...p, quiet_end: Number(e.target.value) }))}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mut.mutate(prefs)} disabled={mut.isPending}>Salvar preferências</Button>
      </div>
    </div>
  );
}
