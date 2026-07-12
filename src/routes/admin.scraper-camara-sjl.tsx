import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Download, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  scrapeCamaraSjlReps,
  importScrapedCamaraSjlReps,
  type ScrapedRepresentative,
} from "@/lib/scrape-camara-sjl.functions";

export const Route = createFileRoute("/admin/scraper-camara-sjl")({
  head: () => ({
    meta: [
      { title: "Scraper — Câmara de São José da Lapa" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ScraperPage,
});

const roleLabel: Record<string, string> = {
  prefeito: "Prefeito",
  vice_prefeito: "Vice-prefeito",
  vereador: "Vereador",
};

function ScraperPage() {
  const runFn = useServerFn(scrapeCamaraSjlReps);
  const importFn = useServerFn(importScrapedCamaraSjlReps);

  const [keyword, setKeyword] = useState("vereador parlamentar câmara mesa diretora");
  const [maxPages, setMaxPages] = useState(20);
  const [results, setResults] = useState<ScrapedRepresentative[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const scrapeMut = useMutation({
    mutationFn: () => runFn({ data: { keyword, maxPages } }),
    onSuccess: (res) => {
      setResults(res.representatives);
      setVisited(res.visited);
      setErrors(res.errors);
      const sel: Record<number, boolean> = {};
      res.representatives.forEach((_, i) => (sel[i] = true));
      setSelected(sel);
      toast.success(
        `${res.representatives.length} parlamentares encontrados em ${res.visited.length} páginas.`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao rodar o scraper"),
  });

  const importMut = useMutation({
    mutationFn: () => {
      const chosen = results.filter((_, i) => selected[i]);
      return importFn({ data: { representatives: chosen } });
    },
    onSuccess: (r) => {
      let msg = `${r.inserted} novos, ${r.updated} atualizados.`;
      if (r.warnings.length) msg += ` ${r.warnings.length} avisos.`;
      toast.success(msg);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao importar"),
  });

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );
  const toggleAll = (v: boolean) => {
    const sel: Record<number, boolean> = {};
    results.forEach((_, i) => (sel[i] = v));
    setSelected(sel);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">
          Scraper — Câmara de São José da Lapa
        </h1>
        <p className="text-sm text-muted-foreground">
          Coleta vereadores, prefeito e vice-prefeito diretamente do portal oficial{" "}
          <a
            href="https://www.camarasaojosedalapa.mg.gov.br"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            camarasaojosedalapa.mg.gov.br
          </a>{" "}
          via Firecrawl + extração estruturada. Idempotente: reexecuções atualizam registros existentes.
        </p>
      </header>

      <Card className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
          <div className="space-y-1">
            <Label htmlFor="kw">Palavras-chave (filtro do map)</Label>
            <Input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mp">Máx. páginas</Label>
            <Input
              id="mp"
              type="number"
              min={1}
              max={40}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value) || 20)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => scrapeMut.mutate()}
              disabled={scrapeMut.isPending}
              className="w-full"
            >
              {scrapeMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Coletando…</>
              ) : (
                <><Search className="mr-2 h-4 w-4" /> Rodar scraper</>
              )}
            </Button>
          </div>
        </div>

        {visited.length > 0 && (
          <div className="text-xs text-muted-foreground">
            <strong>{visited.length}</strong> páginas analisadas ·{" "}
            <strong>{results.length}</strong> parlamentares únicos
            {errors.length > 0 && (
              <> · <span className="text-destructive">{errors.length} erros</span></>
            )}
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedCount === results.length}
                onCheckedChange={(v) => toggleAll(!!v)}
              />
              <span className="text-sm">
                {selectedCount} de {results.length} selecionados
              </span>
            </div>
            <Button
              onClick={() => importMut.mutate()}
              disabled={importMut.isPending || selectedCount === 0}
            >
              {importMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Importar selecionados</>
              )}
            </Button>
          </div>

          <div className="divide-y rounded-md border">
            {results.map((r, i) => (
              <label
                key={`${r.name}-${i}`}
                className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50"
              >
                <Checkbox
                  checked={!!selected[i]}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: !!v }))}
                />
                {r.photo_url ? (
                  <img
                    src={r.photo_url}
                    alt={r.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="secondary">{roleLabel[r.role] ?? r.role}</Badge>
                    {r.party && <Badge variant="outline">{r.party}</Badge>}
                  </div>
                  <div className="space-y-0.5 text-sm text-muted-foreground">
                    {r.phone && <div>📞 {r.phone}</div>}
                    {r.email && <div>✉️ {r.email}</div>}
                    {(r.mandate_start || r.mandate_end) && (
                      <div>
                        🗓️ {r.mandate_start ?? "?"} → {r.mandate_end ?? "?"}
                      </div>
                    )}
                    {(r.facebook || r.instagram) && (
                      <div className="flex gap-2 text-xs">
                        {r.facebook && (
                          <a href={r.facebook} target="_blank" rel="noreferrer" className="underline">
                            Facebook
                          </a>
                        )}
                        {r.instagram && (
                          <a href={r.instagram} target="_blank" rel="noreferrer" className="underline">
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                    {r.bio && <p className="line-clamp-2">{r.bio}</p>}
                    {r.source_url && (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs underline"
                      >
                        {r.source_url}
                      </a>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 font-medium text-destructive">Erros ({errors.length})</h3>
          <ul className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
            {errors.map((e, i) => (
              <li key={i} className="break-all">{e}</li>
            ))}
          </ul>
        </Card>
      )}

      {importMut.isSuccess && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Importação concluída — veja em{" "}
          <a href="/representantes" className="underline">/representantes</a>.
        </div>
      )}
    </div>
  );
}
