import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  adminListBackups,
  adminCreateBackup,
  adminGetBackupDownloadUrl,
  adminDeleteBackup,
  adminRestoreBackup,
} from "@/lib/admin-backup.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Download, Upload, Trash2, DatabaseBackup, RefreshCcw, ShieldAlert, HardDrive, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin/backup")({
  head: () => ({
    meta: [
      { title: "Backup & Restauração — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BackupPage,
});

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR"); } catch { return iso; }
}

type RestoreState = {
  fileName: string;
  payload: {
    schema_version: number;
    created_at?: string;
    tables: Record<string, unknown[]>;
    counts?: Record<string, number>;
  };
} | null;

function BackupPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListBackups);
  const create = useServerFn(adminCreateBackup);
  const getUrl = useServerFn(adminGetBackupDownloadUrl);
  const del = useServerFn(adminDeleteBackup);
  const restore = useServerFn(adminRestoreBackup);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreState, setRestoreState] = useState<RestoreState>(null);
  const [restoreMode, setRestoreMode] = useState<"upsert" | "replace">("upsert");

  const backups = useQuery({
    queryKey: ["admin", "backups"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: () => create(),
    onSuccess: (r) => {
      toast.success(`Backup criado: ${r.fileName} (${r.total} registros)`);
      qc.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
    onError: (e: Error) => toast.error(`Falha ao criar backup: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: (name: string) => del({ data: { name } }),
    onSuccess: () => {
      toast.success("Backup removido");
      qc.invalidateQueries({ queryKey: ["admin", "backups"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: async (input: { payload: RestoreState extends null ? never : RestoreState & object }) => {
      if (!input.payload) throw new Error("Arquivo inválido");
      return restore({
        data: {
          payload: input.payload.payload as any,
          mode: restoreMode,
        },
      });
    },
    onSuccess: (r) => {
      const failed = r.results.filter((x) => x.error);
      const total = r.results.reduce((s, x) => s + x.inserted, 0);
      if (failed.length) {
        toast.warning(`Restauração concluída com ${failed.length} tabela(s) com erro. ${total} registros restaurados.`);
      } else {
        toast.success(`Restauração concluída. ${total} registros restaurados.`);
      }
      setRestoreState(null);
    },
    onError: (e: Error) => toast.error(`Falha na restauração: ${e.message}`),
  });

  const handleDownload = async (name: string) => {
    try {
      const { url } = await getUrl({ data: { name } });
      window.location.href = url;
    } catch (e) {
      toast.error(`Falha ao gerar link: ${(e as Error).message}`);
    }
  };

  const handleFilePicked = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || !parsed.tables || typeof parsed.schema_version !== "number") {
        throw new Error("Arquivo não é um backup válido do AgenddaAqui.");
      }
      setRestoreState({ fileName: file.name, payload: parsed });
    } catch (e) {
      toast.error(`Arquivo inválido: ${(e as Error).message}`);
    }
  };

  const totalCounts = restoreState
    ? Object.values(restoreState.payload.counts ?? {}).reduce((a, b) => a + Number(b || 0), 0)
      || Object.values(restoreState.payload.tables).reduce((a, b) => a + (Array.isArray(b) ? b.length : 0), 0)
    : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <DatabaseBackup className="h-6 w-6 text-primary" />
            Backup & Restauração
          </h1>
          <p className="text-sm text-muted-foreground">
            Exporte todo o catálogo do site (empresas, categorias, promoções, turismo, transporte, representantes e mais) e restaure a partir de um arquivo salvo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="gap-2"
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
            Gerar novo backup
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="h-4 w-4" /> Enviar arquivo para restaurar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePicked(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <div className="font-semibold">Operação sensível</div>
            <p className="text-xs opacity-90">
              Backups contêm dados de todo o site. Os arquivos são armazenados em bucket privado, acessíveis apenas por administradores autenticados via URL assinada de curta duração. A restauração faz <b>upsert por ID</b> — registros existentes são atualizados e novos são inseridos. O modo <b>Substituir</b> apaga os dados atuais da tabela antes de restaurar.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <HardDrive className="h-4 w-4" /> Backups salvos
            {backups.data && (
              <Badge variant="secondary" className="ml-1">{backups.data.length}</Badge>
            )}
          </div>
          <Button
            size="sm" variant="ghost" className="gap-1"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "backups"] })}
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
        <div className="divide-y divide-border">
          {backups.isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
          )}
          {backups.data && backups.data.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum backup salvo ainda. Clique em <b>Gerar novo backup</b> para criar o primeiro.
            </div>
          )}
          {backups.data?.map((b) => (
            <div key={b.name} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{b.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(b.created_at)} · {formatBytes(b.size)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(b.name)}>
                  <Download className="h-3.5 w-3.5" /> Baixar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remover backup "${b.name}"? Esta ação não pode ser desfeita.`)) {
                      deleteMut.mutate(b.name);
                    }
                  }}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={!!restoreState} onOpenChange={(o) => { if (!o) setRestoreState(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restaurar backup</DialogTitle>
            <DialogDescription>
              Revise o conteúdo do arquivo antes de restaurar. Esta ação afeta dados em produção.
            </DialogDescription>
          </DialogHeader>
          {restoreState && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div><b>Arquivo:</b> {restoreState.fileName}</div>
                {restoreState.payload.created_at && (
                  <div><b>Gerado em:</b> {formatDate(restoreState.payload.created_at)}</div>
                )}
                <div><b>Versão do schema:</b> {restoreState.payload.schema_version}</div>
                <div><b>Total de registros:</b> {totalCounts}</div>
                <div><b>Tabelas:</b> {Object.keys(restoreState.payload.tables).length}</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Modo de restauração</div>
                <div className="grid gap-2">
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 hover:bg-muted/50">
                    <input
                      type="radio" name="mode" value="upsert"
                      checked={restoreMode === "upsert"}
                      onChange={() => setRestoreMode("upsert")}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="font-medium">Mesclar (recomendado)</div>
                      <div className="text-xs text-muted-foreground">Atualiza registros existentes pelo ID e insere novos. Não apaga nada.</div>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 hover:bg-destructive/10">
                    <input
                      type="radio" name="mode" value="replace"
                      checked={restoreMode === "replace"}
                      onChange={() => setRestoreMode("replace")}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <div className="font-medium text-destructive">Substituir (destrutivo)</div>
                      <div className="text-xs text-muted-foreground">Apaga os dados atuais de cada tabela antes de restaurar. Use apenas se souber exatamente o que faz.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestoreState(null)} disabled={restoreMut.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!restoreState) return;
                const label = restoreMode === "replace"
                  ? "SUBSTITUIR todos os dados das tabelas incluídas no arquivo"
                  : "mesclar os dados do arquivo com o banco atual";
                if (confirm(`Confirmar restauração? Esta operação vai ${label}.`)) {
                  restoreMut.mutate({ payload: restoreState as any });
                }
              }}
              disabled={restoreMut.isPending}
              className="gap-2"
              variant={restoreMode === "replace" ? "destructive" : "default"}
            >
              {restoreMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Restaurar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
