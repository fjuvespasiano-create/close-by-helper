import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";

export const Route = createFileRoute("/admin/push/templates")({
  head: () => ({ meta: [{ title: "Templates de notificação — Admin" }, { name: "robots", content: "noindex" }] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { data = [] } = useQuery({
    queryKey: ["notif-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("notification_templates").select("*").order("sort");
      return (data ?? []) as Array<{ id: string; slug: string; name: string; category: string; emoji: string | null; color: string | null; title_template: string; body_template: string }>;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Templates prontos</h2>
        <p className="text-sm text-muted-foreground">Modelos reutilizáveis com título, mensagem, emoji e cor. Você pode editá-los ao criar um envio.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ background: `${t.color ?? "#0057FF"}22`, color: t.color ?? "#0057FF" }}>
                {t.emoji ?? "🔔"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{t.name}</div>
                <div className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{t.category}</div>
                <p className="mt-2 text-sm text-foreground">{t.title_template}</p>
                <p className="text-xs text-muted-foreground">{t.body_template}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Link to="/admin/push/novo"><Button size="sm" variant="outline"><Send className="mr-2 h-4 w-4" /> Usar</Button></Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
