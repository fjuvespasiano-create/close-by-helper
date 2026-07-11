import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_NAV_ITEMS, fetchNavItems, saveNavItems, type NavItem } from "@/lib/navItems";

export const Route = createFileRoute("/admin/menu")({
  component: AdminMenu,
});

function AdminMenu() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["nav-items"], queryFn: fetchNavItems });
  const [items, setItems] = useState<NavItem[]>([]);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveNavItems(items),
    onSuccess: () => {
      toast.success("Menu atualizado");
      qc.invalidateQueries({ queryKey: ["nav-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (idx: number, patch: Partial<NavItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) =>
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  const add = () => setItems((prev) => [...prev, { to: "/", label: "Novo item" }]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Menu do site</h1>
          <p className="text-sm text-muted-foreground">
            Edite os links exibidos no cabeçalho (desktop e mobile). Use caminhos internos como <code>/servicos-publicos</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setItems(DEFAULT_NAV_ITEMS)} className="gap-1">
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[auto_1fr_1fr_auto_auto]">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}><ArrowDown className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Rótulo</Label>
                <Input value={it.label} onChange={(e) => update(idx, { label: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Caminho (URL)</Label>
                <Input value={it.to} onChange={(e) => update(idx, { to: e.target.value })} placeholder="/exemplo" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!it.danger} onCheckedChange={(v) => update(idx, { danger: v })} />
                Destaque vermelho
              </label>
              <Button variant="ghost" size="icon" onClick={() => remove(idx)} aria-label="Remover">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={add} className="gap-1"><Plus className="h-4 w-4" /> Adicionar item</Button>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Dica: use apenas rotas que existem no site. Marque "Destaque vermelho" para links de emergência.
      </p>
    </div>
  );
}
