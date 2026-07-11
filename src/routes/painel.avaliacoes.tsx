import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { listMyReviews } from "@/lib/panel";
import { Star } from "lucide-react";

export const Route = createFileRoute("/painel/avaliacoes")({
  component: PanelAvaliacoes,
});

function PanelAvaliacoes() {
  const { userId } = useAdmin();
  const reviews = useQuery({ queryKey: ["panel-reviews", userId], queryFn: () => listMyReviews(userId!), enabled: !!userId });
  const items = reviews.data ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Avaliações</h1>
      <p className="text-sm text-muted-foreground">Últimas avaliações deixadas nas suas empresas.</p>

      <div className="mt-6 space-y-3">
        {reviews.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Star className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
          </div>
        ) : items.map((r) => {
          const company = (r as { companies: { name: string; slug: string } }).companies;
          const profile = (r as { profile: { name: string | null; avatar_url: string | null } | null }).profile;
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : (profile?.name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{profile?.name ?? "Cliente"}</div>
                    <div className="text-xs text-muted-foreground">
                      em <Link to="/empresa/$slug" params={{ slug: company.slug }} className="underline">{company.name}</Link> · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < (r.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  ))}
                </div>
              </div>
              {r.comment ? <p className="mt-3 whitespace-pre-wrap text-sm">{r.comment}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
