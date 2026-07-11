import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSystemSettings, updateSetting } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminConfig,
});

function AdminConfig() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["system-settings"], queryFn: fetchSystemSettings });
  const [local, setLocal] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) {
      const m: Record<string, string> = {};
      data.forEach((s) => { m[s.key] = JSON.stringify(s.value); });
      setLocal(m);
    }
  }, [data]);

  async function save(key: string) {
    try {
      const val = JSON.parse(local[key]);
      await updateSetting(key, val);
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["system-settings"] });
    } catch (e) { toast.error("Valor inválido: " + (e as Error).message); }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Configurações do sistema</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ajuste raio de busca, limites de upload e flags do sistema.</p>
      <div className="mt-6 space-y-3">
        {(data ?? []).map((s) => (
          <div key={s.key} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="w-48">
              <div className="font-medium">{s.key}</div>
              <div className="text-xs text-muted-foreground">{s.is_public ? "Público" : "Privado"}</div>
            </div>
            <Input
              value={local[s.key] ?? ""}
              onChange={(e) => setLocal({ ...local, [s.key]: e.target.value })}
              className="flex-1 font-mono text-sm"
            />
            <Button onClick={() => save(s.key)}>Salvar</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
