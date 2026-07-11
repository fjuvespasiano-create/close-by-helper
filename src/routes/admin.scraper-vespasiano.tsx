import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Download, Search, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  scrapeVespasianoContacts,
  importScrapedContacts,
  type ScrapedContact,
} from "@/lib/scrape-vespasiano.functions";
import { categoryLabel } from "@/lib/publicServices";

export const Route = createFileRoute("/admin/scraper-vespasiano")({
  head: () => ({ meta: [{ title: "Scraper Vespasiano — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ScraperPage,
});

function ScraperPage() {
  const run = useServerFn(scrapeVespasianoContacts);
  const imp = useServerFn(importScrapedContacts);
  const [keyword, setKeyword] = useState("telefone contato secretaria serviço");
  const [maxPages, setMaxPages] = useState(15);
  const [results, setResults] = useState<ScrapedContact[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const scrapeMut = useMutation({
    mutationFn: () => run({ data: { keyword, maxPages } }),
    onSuccess: (res) => {
      setResults(res.contacts);
      setVisited(res.visited);
      setErrors(res.errors);
      const sel: Record<number, boolean> = {};
      res.contacts.forEach((_, i) => (sel[i] = true));
      setSelected(sel);
      toast.success(`${res.contacts.length} contatos extraídos de ${res.visited.length} páginas.`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao rodar o scraper"),
  });

  const importMut = useMutation({
    mutationFn: () => {
      const chosen = results.filter((_, i) => selected[i]);
      return imp({ data: { contacts: chosen } });
    },
    onSuccess: (r) => toast.success(`${r.inserted} serviços importados para Serviços Públicos.`),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao importar"),
  });

  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const toggleAll = (v: boolean) => {
    const sel: Record<number, boolean> = {};
    results.forEach((_, i) => (sel[i] = v));
    setSelected(sel);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Scraper — Telefones úteis de Vespasiano</h1>
        <p className="text-sm text-muted-foreground">
          Extrai serviços e contatos públicos do site oficial{" "}
          <a href="https://www.vespasiano.mg.gov.br" target="_blank" rel="noreferrer" className="underline">
            vespasiano.mg.gov.br
          </a>{" "}
          usando Firecrawl e importa direto na tabela de Serviços Públicos.
        </p>
      </header>

      <Card className="p-4 space-y-4">
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
              onChange={(e) => setMaxPages(Number(e.target.value) || 15)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => scrapeMut.mutate()} disabled={scrapeMut.isPending} className="w-full">
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
            <strong>{visited.length}</strong> páginas analisadas · <strong>{results.length}</strong> contatos únicos ·{" "}
            {errors.length > 0 && <span className="text-destructive">{errors.length} erros</span>}
          </div>
        )}
      </Card>

      {results.length > 0 && (
        <Card className="p-4 space-y-3">
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
            {results.map((c, i) => (
              <label
                key={`${c.name}-${i}`}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={!!selected[i]}
                  onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: !!v }))}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="secondary">{categoryLabel(c.category)}</Badge>
                    {c.subtype && <Badge variant="outline">{c.subtype}</Badge>}
                    {c.is_24h && <Badge>24h</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {c.phone && <div>📞 {c.phone}{c.phone_secondary && ` · ${c.phone_secondary}`}</div>}
                    {c.whatsapp && <div>💬 {c.whatsapp}</div>}
                    {c.email && <div>✉️ {c.email}</div>}
                    {c.address && <div>📍 {c.address}{c.neighborhood && ` — ${c.neighborhood}`}</div>}
                    {c.hours && <div>🕒 {c.hours}</div>}
                    {c.description && <div className="line-clamp-2">{c.description}</div>}
                    {c.source_url && (
                      <a
                        href={c.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline break-all"
                      >
                        {c.source_url}
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
          <h3 className="font-medium mb-2 text-destructive">Erros ({errors.length})</h3>
          <ul className="text-xs space-y-1 text-muted-foreground max-h-40 overflow-auto">
            {errors.map((e, i) => <li key={i} className="break-all">{e}</li>)}
          </ul>
        </Card>
      )}

      {importMut.isSuccess && (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Importação concluída — veja em Serviços Públicos.
        </div>
      )}
    </div>
  );
}
