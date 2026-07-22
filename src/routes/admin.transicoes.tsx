import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PRESETS, type TransitionPreset } from "@/components/site/PageTransition";
import {
  DEFAULT_CONFIG,
  EASINGS,
  TRANSITION_PRESETS,
  loadTransitionConfig,
  resolveEasing,
  saveTransitionConfig,
  type PageTransitionConfig,
} from "@/lib/page-transition-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, RotateCcw, Play, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/transicoes")({
  head: () => ({
    meta: [
      { title: "Transições de página — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransitionsAdmin,
});

function TransitionsAdmin() {
  const [cfg, setCfg] = useState<PageTransitionConfig>(DEFAULT_CONFIG);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewPreset, setPreviewPreset] = useState<TransitionPreset>("fade");

  useEffect(() => {
    setCfg(loadTransitionConfig());
  }, []);

  const update = <K extends keyof PageTransitionConfig>(key: K, value: PageTransitionConfig[K]) =>
    setCfg((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    saveTransitionConfig(cfg);
    toast.success("Configuração de transições salva. Já está ativa em toda a aplicação.");
  };

  const reset = () => {
    setCfg(DEFAULT_CONFIG);
    saveTransitionConfig(DEFAULT_CONFIG);
    toast.info("Configuração restaurada para o padrão.");
  };

  const addOverride = () =>
    update("overrides", [...cfg.overrides, { pathPrefix: "/", preset: cfg.defaultPreset }]);

  const removeOverride = (idx: number) =>
    update(
      "overrides",
      cfg.overrides.filter((_, i) => i !== idx),
    );

  const previewEase = resolveEasing(cfg.easing);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transições de página</h1>
          <p className="text-sm text-muted-foreground">
            Ajuste efeitos, durações e regras por rota. As mudanças salvas ficam ativas para este navegador.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 size-4" /> Padrão
          </Button>
          <Button onClick={save}>
            <Save className="mr-2 size-4" /> Salvar
          </Button>
        </div>
      </header>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="text-base font-semibold">Ativar transições</Label>
            <p className="text-sm text-muted-foreground">
              Se desativado, as páginas trocam sem animação (respeita <code>prefers-reduced-motion</code>).
            </p>
          </div>
          <Switch checked={cfg.enabled} onCheckedChange={(v) => update("enabled", v)} />
        </div>
      </section>

      <section className="grid gap-6 rounded-xl border bg-card p-5 shadow-sm md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block font-semibold">Preset padrão</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TRANSITION_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => update("defaultPreset", p.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-all hover:border-primary hover:shadow-sm ${
                    cfg.defaultPreset === p.value ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block font-semibold">
              Duração: {cfg.duration.toFixed(2)}s
            </Label>
            <Slider
              min={0.05}
              max={1.2}
              step={0.01}
              value={[cfg.duration]}
              onValueChange={([v]) => update("duration", v)}
            />
          </div>

          <div>
            <Label className="mb-2 block font-semibold">Curva de aceleração</Label>
            <select
              value={cfg.easing}
              onChange={(e) => update("easing", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {EASINGS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block font-semibold">Preview</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            <select
              value={previewPreset}
              onChange={(e) => setPreviewPreset(e.target.value as TransitionPreset)}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              {TRANSITION_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" onClick={() => setPreviewKey((k) => k + 1)}>
              <Play className="mr-1 size-4" /> Reproduzir
            </Button>
          </div>
          <div className="relative h-56 overflow-hidden rounded-lg border bg-gradient-to-br from-muted/60 to-muted">
            <motion.div
              key={previewKey}
              variants={PRESETS[previewPreset]}
              initial="initial"
              animate="animate"
              transition={{ duration: cfg.duration, ease: previewEase }}
              className="absolute inset-0 grid place-items-center"
            >
              <div className="rounded-xl bg-primary px-6 py-4 text-primary-foreground shadow-lg">
                <div className="text-lg font-semibold">Página exemplo</div>
                <div className="text-xs opacity-80">Preset: {previewPreset}</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Regras por rota</h2>
            <p className="text-sm text-muted-foreground">
              Rotas que começam com o prefixo usam o preset indicado; caso contrário, cai para o padrão.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={addOverride}>
            <Plus className="mr-1 size-4" /> Adicionar regra
          </Button>
        </div>

        <div className="space-y-2">
          {cfg.overrides.length === 0 ? (
            <p className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
              Sem regras específicas — todas as rotas usam o preset padrão.
            </p>
          ) : (
            cfg.overrides.map((ov, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <Input
                  value={ov.pathPrefix}
                  onChange={(e) => {
                    const next = [...cfg.overrides];
                    next[idx] = { ...ov, pathPrefix: e.target.value };
                    update("overrides", next);
                  }}
                  placeholder="/prefixo"
                  className="max-w-xs"
                />
                <select
                  value={ov.preset}
                  onChange={(e) => {
                    const next = [...cfg.overrides];
                    next[idx] = { ...ov, preset: e.target.value as TransitionPreset };
                    update("overrides", next);
                  }}
                  className="rounded-md border bg-background px-2 py-2 text-sm"
                >
                  {TRANSITION_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeOverride(idx)}
                  aria-label="Remover regra"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Dica: usuários com <code>prefers-reduced-motion</code> ativado não veem nenhuma animação, independentemente da configuração.
      </p>
    </div>
  );
}
