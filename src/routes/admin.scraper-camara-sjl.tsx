import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Download, Loader2, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type ManualRep = {
  name: string;
  role: "prefeito" | "vice_prefeito" | "vereador";
  party: string;
  photo_url: string;
  email: string;
  phone: string;
  bio: string;
  mandate_start: string;
  mandate_end: string;
  facebook: string;
  instagram: string;
  source_url: string;
};

const emptyRep = (): ManualRep => ({
  name: "",
  role: "vereador",
  party: "",
  photo_url: "",
  email: "",
  phone: "",
  bio: "",
  mandate_start: "",
  mandate_end: "",
  facebook: "",
  instagram: "",
  source_url: "",
});

function ScraperPage() {
  const runFn = useServerFn(scrapeCamaraSjlReps);
  const importFn = useServerFn(importScrapedCamaraSjlReps);

  const [keyword, setKeyword] = useState("vereador parlamentar câmara mesa diretora");
  const [maxPages, setMaxPages] = useState(20);
  const [results, setResults] = useState<ScrapedRepresentative[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const [manual, setManual] = useState<ManualRep[]>([emptyRep()]);

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

  const manualImportMut = useMutation({
    mutationFn: () => {
      // Normaliza: strings vazias viram undefined para não quebrar validação Zod (email/url)
      const cleaned = manual
        .filter((m) => m.name.trim().length >= 3)
        .map((m) => {
          const o: Record<string, unknown> = { name: m.name.trim(), role: m.role };
          const optStr = (v: string) => (v.trim() ? v.trim() : undefined);
          o.party = optStr(m.party);
          o.photo_url = optStr(m.photo_url);
          o.email = optStr(m.email);
          o.phone = optStr(m.phone);
          o.bio = optStr(m.bio);
          o.mandate_start = optStr(m.mandate_start);
          o.mandate_end = optStr(m.mandate_end);
          o.facebook = optStr(m.facebook);
          o.instagram = optStr(m.instagram);
          o.source_url = optStr(m.source_url);
          return o as ScrapedRepresentative;
        });
      if (cleaned.length === 0) {
        return Promise.reject(new Error("Preencha ao menos um parlamentar com nome válido."));
      }
      return importFn({ data: { representatives: cleaned } });
    },
    onSuccess: (r) => {
      let msg = `${r.inserted} novos, ${r.updated} atualizados.`;
      if (r.warnings.length) msg += ` ${r.warnings.length} avisos.`;
      toast.success(msg);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao importar manualmente"),
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

  const updateManual = (i: number, patch: Partial<ManualRep>) =>
    setManual((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const addManual = () => setManual((prev) => [...prev, emptyRep()]);
  const removeManual = (i: number) =>
    setManual((prev) => (prev.length <= 1 ? [emptyRep()] : prev.filter((_, idx) => idx !== i)));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">
          Câmara de São José da Lapa — Parlamentares
        </h1>
        <p className="text-sm text-muted-foreground">
          Colete via Firecrawl no portal{" "}
          <a
            href="https://www.camarasaojosedalapa.mg.gov.br"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            camarasaojosedalapa.mg.gov.br
          </a>{" "}
          ou cadastre manualmente quando o site oficial estiver indisponível/bloqueado. Ambos os fluxos são idempotentes (upsert por slug do nome).
        </p>
      </header>

      <Tabs defaultValue="auto" className="space-y-4">
        <TabsList>
          <TabsTrigger value="auto">
            <Search className="mr-2 h-4 w-4" /> Coleta automática
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Plus className="mr-2 h-4 w-4" /> Cadastro manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="space-y-6">
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
                          <div>🗓️ {r.mandate_start ?? "?"} → {r.mandate_end ?? "?"}</div>
                        )}
                        {r.bio && <p className="line-clamp-2">{r.bio}</p>}
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
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <Card className="p-4 text-sm text-muted-foreground">
            Use este formulário quando o portal oficial estiver bloqueando o scraper
            (WAF/BotDetect) ou para complementar dados. Apenas <strong>nome</strong> e{" "}
            <strong>cargo</strong> são obrigatórios; os demais campos são opcionais.
          </Card>

          <div className="space-y-4">
            {manual.map((m, i) => (
              <Card key={i} className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Parlamentar #{i + 1}
                    {m.name && <span className="ml-2 text-muted-foreground">— {m.name}</span>}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeManual(i)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remover
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Nome completo *</Label>
                    <Input
                      value={m.name}
                      onChange={(e) => updateManual(i, { name: e.target.value })}
                      placeholder="Ex.: José da Silva"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cargo *</Label>
                    <Select value={m.role} onValueChange={(v) => updateManual(i, { role: v as ManualRep["role"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vereador">Vereador</SelectItem>
                        <SelectItem value="prefeito">Prefeito</SelectItem>
                        <SelectItem value="vice_prefeito">Vice-prefeito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Partido</Label>
                    <Input value={m.party} onChange={(e) => updateManual(i, { party: e.target.value })} placeholder="PT, PSD, MDB…" />
                  </div>
                  <div className="space-y-1">
                    <Label>Foto (URL)</Label>
                    <Input value={m.photo_url} onChange={(e) => updateManual(i, { photo_url: e.target.value })} placeholder="https://…" />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input type="email" value={m.email} onChange={(e) => updateManual(i, { email: e.target.value })} placeholder="nome@camarasjl.mg.gov.br" />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input value={m.phone} onChange={(e) => updateManual(i, { phone: e.target.value })} placeholder="(31) 99999-9999" />
                  </div>
                  <div className="space-y-1">
                    <Label>Início do mandato</Label>
                    <Input type="date" value={m.mandate_start} onChange={(e) => updateManual(i, { mandate_start: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fim do mandato</Label>
                    <Input type="date" value={m.mandate_end} onChange={(e) => updateManual(i, { mandate_end: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Facebook (URL)</Label>
                    <Input value={m.facebook} onChange={(e) => updateManual(i, { facebook: e.target.value })} placeholder="https://facebook.com/…" />
                  </div>
                  <div className="space-y-1">
                    <Label>Instagram (URL)</Label>
                    <Input value={m.instagram} onChange={(e) => updateManual(i, { instagram: e.target.value })} placeholder="https://instagram.com/…" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Fonte (URL de referência)</Label>
                    <Input value={m.source_url} onChange={(e) => updateManual(i, { source_url: e.target.value })} placeholder="https://…" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label>Biografia / mini-currículo</Label>
                    <Textarea
                      rows={3}
                      value={m.bio}
                      onChange={(e) => updateManual(i, { bio: e.target.value })}
                      placeholder="Breve apresentação, trajetória e áreas de atuação…"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={addManual}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar outro parlamentar
            </Button>
            <Button
              onClick={() => manualImportMut.mutate()}
              disabled={manualImportMut.isPending}
            >
              {manualImportMut.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Salvar cadastros</>
              )}
            </Button>
          </div>

          {manualImportMut.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Cadastro concluído — veja em{" "}
              <a href="/representantes" className="underline">/representantes</a>.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
