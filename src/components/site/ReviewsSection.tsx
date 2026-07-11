import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompanyReviews } from "@/lib/queries";
import { useCurrentUserId } from "@/lib/favorites";

type ReviewRow = Awaited<ReturnType<typeof fetchCompanyReviews>>[number];

export function ReviewsSection({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const reviews = useQuery<ReviewRow[]>({
    queryKey: ["reviews", companyId],
    queryFn: () => fetchCompanyReviews(companyId),
  });

  const userId = useCurrentUserId();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const mutate = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Faça login para avaliar.");
      const { error } = await supabase.from("reviews").upsert(
        { company_id: companyId, user_id: u.user.id, rating, comment: comment.trim() || null },
        { onConflict: "company_id,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada!");
      setComment("");
      qc.invalidateQueries({ queryKey: ["reviews", companyId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  const list = reviews.data ?? [];
  const avg = list.length ? list.reduce((a, b) => a + b.rating, 0) / list.length : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Avaliações</h2>
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <span className="font-semibold">{avg ? avg.toFixed(1) : "—"}</span>
          <span className="text-muted-foreground">({list.length})</span>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Seja o primeiro a avaliar esta empresa.</p>
        ) : (
          list.map((r) => {
            const displayName = r.author_name ?? "Cliente";
            const isGoogle = r.source === "google";
            const date = r.review_date ?? r.created_at;
            return (
              <div key={r.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{displayName}</span>
                  {isGoogle ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:bg-blue-950/40">
                      Google
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    · {new Date(date).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {r.comment ? <p className="mt-2 text-sm text-foreground/90">{r.comment}</p> : null}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <h3 className="font-semibold">Deixe sua avaliação</h3>
        {!userId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            <a href="/auth" className="font-medium text-primary hover:underline">Entre na sua conta</a> para avaliar esta empresa.
          </p>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutate.mutate();
            }}
          >
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} estrelas`}>
                  <Star className={`h-6 w-6 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`} />
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte como foi sua experiência..."
              rows={3}
              maxLength={1000}
            />
            <Button type="submit" disabled={mutate.isPending}>
              {mutate.isPending ? "Enviando..." : "Publicar avaliação"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
