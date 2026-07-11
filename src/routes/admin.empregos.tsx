import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminListJobSources, adminUpsertJobSource, adminDeleteJobSource, adminRunJobSourceSync,
  adminListJobs, adminUpsertJob, adminDeleteJob, adminToggleJob, adminListJobSyncLogs,
} from "@/lib/admin-jobs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Trash2, ExternalLink, Info } from "lucide-react";

export const Route = createFileRoute("/admin/empregos")({
  component: AdminEmpregos,
});

type Tab = "sources" | "jobs" | "logs";

function AdminEmpregos() {
  const [tab, setTab] = useState<Tab>("sources");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Empregos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Configure fontes automáticas e cadastre vagas locais.</p>

      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
        <Info className="mr-1.5 inline h-4 w-4" />
        <strong>SINE (Emprega Brasil)</strong> não possui API pública. Use a fonte manual para republicar vagas do SINE local.
      </div>

      <div className="mt-6 flex gap-1 border-b border-border">
        {(["sources", "jobs", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "sources" ? "Fontes" : t === "jobs" ? "Vagas" : "Logs"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "sources" && <SourcesTab />}
        {tab === "jobs" && <JobsTab />}
        {tab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}

// ---------------- Sources ----------------
function SourcesTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListJobSources);
  const upsert = useServerFn(adminUpsertJobSource);
  const del = useServerFn(adminDeleteJobSource);
  const runSync = useServerFn(adminRunJobSourceSync);

  const { data: rows } = useQuery({ queryKey: ["admin-job-sources"], queryFn: () => list() });
  const [editing, setEditing] = useState<any | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  async function handleRun(id: string) {
    setRunning(id);
    try {
      const r = await runSync({ data: { id } });
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["admin-job-sources"] });
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setRunning(null); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta fonte? As vagas relacionadas ficarão órfãs.")) return;
    try {
      await del({ data: { id } });
      toast.success("Fonte removida");
      qc.invalidateQueries({ queryKey: ["admin-job-sources"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Nova fonte</Button>
      </div>
      <div className="space-y-3">
        {(rows ?? []).map((s: any) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{s.kind}</span>
                  {!s.is_active && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">inativa</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">slug: {s.slug} · a cada {s.sync_frequency_minutes} min</p>
                {s.endpoint_url && <p className="mt-1 truncate text-xs text-muted-foreground">{s.endpoint_url}</p>}
                {s.last_sync_message && (
                  <p className={`mt-2 text-xs ${s.last_sync_status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                    Último: {s.last_sync_status} — {s.last_sync_message}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {(s.kind === "api" || s.kind === "scrape") && (
                  <Button size="sm" variant="outline" disabled={running === s.id} onClick={() => handleRun(s.id)}>
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${running === s.id ? "animate-spin" : ""}`} /> Sincronizar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma fonte cadastrada.</p>}
      </div>

      {editing && (
        <SourceDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            try {
              await upsert({ data: payload });
              toast.success("Fonte salva");
              qc.invalidateQueries({ queryKey: ["admin-job-sources"] });
              setEditing(null);
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      )}
    </div>
  );
}

function SourceDialog({ initial, onClose, onSave }: { initial: any; onClose: () => void; onSave: (p: any) => void }) {
  const [form, setForm] = useState({
    id: initial.id,
    slug: initial.slug ?? "",
    name: initial.name ?? "",
    kind: initial.kind ?? "manual",
    endpoint_url: initial.endpoint_url ?? "",
    config: JSON.stringify(initial.config ?? {}, null, 2),
    is_active: initial.is_active ?? true,
    sync_frequency_minutes: initial.sync_frequency_minutes ?? 60,
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} fonte</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Slug</label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><label className="text-xs font-medium">Tipo</label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API JSON</SelectItem>
                  <SelectItem value="scrape">Scrape (Firecrawl)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><label className="text-xs font-medium">Nome</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          {form.kind !== "manual" && (
            <div><label className="text-xs font-medium">Endpoint URL</label><Input value={form.endpoint_url} onChange={(e) => setForm({ ...form, endpoint_url: e.target.value })} /></div>
          )}
          <div><label className="text-xs font-medium">Frequência (min)</label><Input type="number" value={form.sync_frequency_minutes} onChange={(e) => setForm({ ...form, sync_frequency_minutes: Number(e.target.value) })} /></div>
          <div><label className="text-xs font-medium">Config (JSON)</label>
            <Textarea rows={5} className="font-mono text-xs" value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} />
          </div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><span className="text-sm">Ativa</span></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            let cfg: Record<string, unknown> = {};
            try { cfg = JSON.parse(form.config || "{}"); } catch { toast.error("Config JSON inválido"); return; }
            onSave({
              id: form.id,
              slug: form.slug.trim(),
              name: form.name.trim(),
              kind: form.kind,
              endpoint_url: form.endpoint_url?.trim() || null,
              config: cfg,
              is_active: form.is_active,
              sync_frequency_minutes: form.sync_frequency_minutes,
            });
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Jobs ----------------
function JobsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListJobs);
  const upsert = useServerFn(adminUpsertJob);
  const del = useServerFn(adminDeleteJob);
  const toggle = useServerFn(adminToggleJob);
  const listSources = useServerFn(adminListJobSources);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any | null>(null);

  const { data } = useQuery({ queryKey: ["admin-jobs", q, page], queryFn: () => list({ data: { q: q || undefined, page, pageSize: 50, is_active: "all" as const } }) });
  const { data: sources } = useQuery({ queryKey: ["admin-job-sources"], queryFn: () => listSources() });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Buscar por título…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" />
        <div className="flex-1" />
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Nova vaga</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Título</th><th className="p-3">Empresa</th><th className="p-3">Local</th><th className="p-3">Fonte</th><th className="p-3">Ativa</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((j: any) => (
              <tr key={j.id} className="border-t border-border">
                <td className="p-3 font-medium">{j.title}</td>
                <td className="p-3 text-muted-foreground">{j.company_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{j.is_remote ? "Remoto" : [j.location_city, j.location_state].filter(Boolean).join(" · ") || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{j.job_sources?.name ?? "—"}</td>
                <td className="p-3"><Switch checked={j.is_active} onCheckedChange={async (v) => { await toggle({ data: { id: j.id, is_active: v } }); qc.invalidateQueries({ queryKey: ["admin-jobs"] }); }} /></td>
                <td className="p-3 text-right">
                  {j.apply_url && <a href={j.apply_url} target="_blank" rel="noopener noreferrer" className="mr-2 text-muted-foreground hover:text-foreground"><ExternalLink className="inline h-4 w-4" /></a>}
                  <button onClick={() => setEditing(j)} className="mr-2 text-xs text-primary hover:underline">Editar</button>
                  <button onClick={async () => { if (confirm("Excluir?")) { await del({ data: { id: j.id } }); qc.invalidateQueries({ queryKey: ["admin-jobs"] }); } }}><Trash2 className="h-4 w-4 text-destructive" /></button>
                </td>
              </tr>
            ))}
            {data?.rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma vaga.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.total > data.pageSize && (
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}

      {editing && (
        <JobDialog
          initial={editing}
          sources={sources ?? []}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            try {
              await upsert({ data: payload });
              toast.success("Vaga salva");
              qc.invalidateQueries({ queryKey: ["admin-jobs"] });
              setEditing(null);
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      )}
    </div>
  );
}

function JobDialog({ initial, sources, onClose, onSave }: { initial: any; sources: any[]; onClose: () => void; onSave: (p: any) => void }) {
  const manualSources = sources.filter((s) => s.kind === "manual");
  const [form, setForm] = useState({
    id: initial.id,
    source_id: initial.source_id ?? manualSources[0]?.id ?? "",
    title: initial.title ?? "",
    company_name: initial.company_name ?? "",
    description: initial.description ?? "",
    location_city: initial.location_city ?? "Vespasiano",
    location_state: initial.location_state ?? "MG",
    is_remote: initial.is_remote ?? false,
    employment_type: initial.employment_type ?? "",
    salary_min: initial.salary_min ?? "",
    salary_max: initial.salary_max ?? "",
    apply_url: initial.apply_url ?? "",
    tags: (initial.tags ?? []).join(", "),
    is_active: initial.is_active ?? true,
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? "Editar" : "Nova"} vaga</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs font-medium">Fonte</label>
            <Select value={form.source_id} onValueChange={(v) => setForm({ ...form, source_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs font-medium">Título *</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="text-xs font-medium">Empresa</label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
          <div><label className="text-xs font-medium">Descrição</label><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium">Cidade</label><Input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })} /></div>
            <div><label className="text-xs font-medium">UF</label><Input value={form.location_state} onChange={(e) => setForm({ ...form, location_state: e.target.value })} /></div>
            <div className="flex items-end gap-2"><Switch checked={form.is_remote} onCheckedChange={(v) => setForm({ ...form, is_remote: v })} /><span className="text-sm">Remoto</span></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium">Tipo</label><Input placeholder="CLT / PJ / estágio" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} /></div>
            <div><label className="text-xs font-medium">Salário mín (R$)</label><Input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} /></div>
            <div><label className="text-xs font-medium">Salário máx (R$)</label><Input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} /></div>
          </div>
          <div><label className="text-xs font-medium">Link de candidatura</label><Input value={form.apply_url} onChange={(e) => setForm({ ...form, apply_url: e.target.value })} /></div>
          <div><label className="text-xs font-medium">Tags (separadas por vírgula)</label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><span className="text-sm">Ativa</span></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.source_id) { toast.error("Selecione uma fonte"); return; }
            onSave({
              id: form.id,
              source_id: form.source_id,
              title: form.title.trim(),
              company_name: form.company_name.trim() || null,
              description: form.description.trim() || null,
              location_city: form.location_city.trim() || null,
              location_state: form.location_state.trim() || null,
              is_remote: form.is_remote,
              employment_type: form.employment_type.trim() || null,
              salary_min: form.salary_min ? Number(form.salary_min) : null,
              salary_max: form.salary_max ? Number(form.salary_max) : null,
              apply_url: form.apply_url.trim() || null,
              tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
              is_active: form.is_active,
            });
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Logs ----------------
function LogsTab() {
  const list = useServerFn(adminListJobSyncLogs);
  const { data } = useQuery({ queryKey: ["admin-job-logs"], queryFn: () => list() });
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
          <tr><th className="p-3">Início</th><th className="p-3">Fonte</th><th className="p-3">Status</th><th className="p-3">Fetched</th><th className="p-3">Novos</th><th className="p-3">Atualizados</th><th className="p-3">Erros</th><th className="p-3">Mensagem</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((l: any) => (
            <tr key={l.id} className="border-t border-border">
              <td className="p-3 text-xs">{new Date(l.started_at).toLocaleString("pt-BR")}</td>
              <td className="p-3">{l.job_sources?.name ?? "—"}</td>
              <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${l.status === "ok" ? "bg-emerald-500/10 text-emerald-600" : l.status === "error" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{l.status}</span></td>
              <td className="p-3">{l.fetched}</td><td className="p-3">{l.inserted}</td><td className="p-3">{l.updated}</td><td className="p-3">{l.errors}</td>
              <td className="p-3 text-xs text-muted-foreground">{l.message}</td>
            </tr>
          ))}
          {data && data.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Sem logs ainda.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
