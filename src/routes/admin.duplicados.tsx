import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { scanDuplicates, type ScanResult } from "@/lib/duplicates.functions";

export const Route = createFileRoute("/admin/duplicados")({
  head: () => ({ meta: [{ title: "Conteúdo duplicado — Admin" }, { name: "robots", content: "noindex" }] }),
  component: DuplicatesPage,
});

const SOURCE_OPTS: { value: "blog" | "empresa" | "evento"; label: string }[] = [
  { value: "blog", label: "Blog" },
  { value: "empresa", label: "Empresas" },
  { value: "evento", label: "Eventos" },
];

function simColor(s: number) {
  if (s >= 0.9) return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200";
  if (s >= 0.75) return "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200";
  return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200";
}

function DuplicatesPage() {
  const scan = useServerFn(scanDuplicates);
  const [threshold, setThreshold] = useState(0.6);
  const [crossSource, setCrossSource] = useState(false);
  const [sources, setSources] = useState<("blog" | "empresa" | "evento")[]>(["blog", "empresa", "evento"]);
  const [result, setResult] = useState<ScanResult | null>(null);

  const m = useMutation({
    mutationFn: () => scan({ data: { threshold, crossSource, sources } }),
    onSuccess: (r) => { setResult(r); toast.success(`Varredura concluída: ${r.totalItems} itens, ${r.pairs.length} pares suspeitos.`); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha na varredura"),
  });

  function toggleSource(v: "blog" | "empresa" | "evento") {
    setSources((s) => s.includes(v) ? s.filter((x) => x !== v) : [...s, v]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Conteúdo duplicado</h1>
        <p className="text-sm text-muted-foreground">
          Varre posts do blog, descrições de empresas e eventos, comparando por similaridade de texto (shingles + Jaccard).
          Cabeçalhos, rodapés e menus são ignorados por operarmos direto no banco.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="text-xs">Fontes a varrer</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SOURCE_OPTS.map((o) => (
                <button key={o.value} type="button" onClick={() => toggleSource(o.value)}
                  className={`rounded-full border px-3 py-1 text-xs ${sources.includes(o.value) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Limite de similaridade: {(threshold * 100).toFixed(0)}%</Label>
            <Slider min={30} max={99} step={1} value={[Math.round(threshold * 100)]} onValueChange={(v) => setThreshold((v[0] ?? 60) / 100)} className="mt-3" />
            <p className="mt-1 text-xs text-muted-foreground">Pares com similaridade ≥ deste valor entram no relatório.</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={crossSource} onCheckedChange={setCrossSource} id="cross" />
              <Label htmlFor="cross" className="!m-0 text-sm">Comparar entre fontes diferentes</Label>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">
            {result ? `Última varredura: ${new Date(result.scannedAt).toLocaleString("pt-BR")}` : "Nenhuma varredura executada ainda."}
          </div>
          <Button onClick={() => m.mutate()} disabled={m.isPending || sources.length === 0} className="gap-2">
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {m.isPending ? "Analisando…" : "Rodar varredura"}
          </Button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Itens analisados" value={result.totalItems} />
            <StatCard label="Blog" value={result.bySource.blog} />
            <StatCard label="Empresas" value={result.bySource.empresa} />
            <StatCard label="Eventos" value={result.bySource.evento} />
          </div>

          <section className="rounded-xl border border-border bg-card">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="font-medium">Pares com alta similaridade ({result.pairs.length})</h2>
            </header>
            {result.pairs.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum par acima do limite escolhido. 🎉</p>
            ) : (
              <ul className="divide-y divide-border">
                {result.pairs.map((p, idx) => (
                  <li key={idx} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${simColor(p.similarity)}`}>
                        {(p.similarity * 100).toFixed(1)}% similar
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.a.sourceLabel} ↔ {p.b.sourceLabel}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <PairItem side={p.a} />
                      <PairItem side={p.b} />
                    </div>
                    {p.sharedParagraphs.length > 0 && (
                      <details className="mt-3 rounded-md bg-muted/40 p-3 text-xs">
                        <summary className="cursor-pointer font-medium">Trechos idênticos ({p.sharedParagraphs.length})</summary>
                        <ul className="mt-2 space-y-2">
                          {p.sharedParagraphs.map((s, i) => (
                            <li key={i} className="rounded bg-background p-2 font-mono text-[11px] leading-relaxed">“{s}…”</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="font-medium">Parágrafos repetidos entre itens ({result.paragraphClusters.length})</h2>
            </header>
            {result.paragraphClusters.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum parágrafo idêntico compartilhado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {result.paragraphClusters.map((c, i) => (
                  <li key={i} className="p-4">
                    <p className="rounded bg-muted/40 p-2 font-mono text-[12px] leading-relaxed">“{c.snippet}…”</p>
                    <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                      {c.occurrences.map((o) => (
                        <a key={o.key} href={o.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 hover:bg-muted">
                          <span className="text-muted-foreground">{o.sourceLabel}:</span>
                          <span className="max-w-[220px] truncate">{o.title}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function PairItem({ side }: { side: { sourceLabel: string; title: string; url: string } }) {
  return (
    <a href={side.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2 rounded-md border border-border p-2 hover:border-primary/60 hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{side.sourceLabel}</div>
        <div className="truncate text-sm font-medium">{side.title}</div>
        <div className="truncate text-xs text-muted-foreground">{side.url}</div>
      </div>
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
    </a>
  );
}
