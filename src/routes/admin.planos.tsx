import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlansConfig, updatePlanConfig } from "@/lib/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/admin/planos")({
  component: AdminPlanos,
});

function AdminPlanos() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["plans-config"], queryFn: fetchPlansConfig });
  const [local, setLocal] = useState<Record<string, { price_cents: number; duration_days: number; max_photos: number }>>({});

  useEffect(() => {
    if (data) {
      const map: typeof local = {};
      data.forEach((p) => {
        map[p.slug] = { price_cents: p.price_cents, duration_days: p.duration_days, max_photos: p.max_photos };
      });
      setLocal(map);
    }
  }, [data]);

  async function save(slug: string) {
    try {
      await updatePlanConfig(slug, local[slug]);
      toast.success("Plano atualizado");
      qc.invalidateQueries({ queryKey: ["plans-config"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Planos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Configure preço, duração e limites de cada plano.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(data ?? []).map((p) => (
          <div key={p.slug} className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-semibold">{p.name}</h3>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.slug}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium">
                Preço (centavos)
                <Input
                  type="number"
                  value={local[p.slug]?.price_cents ?? 0}
                  onChange={(e) => setLocal({ ...local, [p.slug]: { ...local[p.slug], price_cents: Number(e.target.value) } })}
                />
              </label>
              <label className="block text-xs font-medium">
                Duração (dias)
                <Input
                  type="number"
                  value={local[p.slug]?.duration_days ?? 0}
                  onChange={(e) => setLocal({ ...local, [p.slug]: { ...local[p.slug], duration_days: Number(e.target.value) } })}
                />
              </label>
              <label className="block text-xs font-medium">
                Máx. fotos
                <Input
                  type="number"
                  value={local[p.slug]?.max_photos ?? 0}
                  onChange={(e) => setLocal({ ...local, [p.slug]: { ...local[p.slug], max_photos: Number(e.target.value) } })}
                />
              </label>
              <Button onClick={() => save(p.slug)} className="w-full">Salvar</Button>
            </div>
            {Array.isArray(p.features) ? (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {(p.features as string[]).map((f) => <li key={f}>• {f}</li>)}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
