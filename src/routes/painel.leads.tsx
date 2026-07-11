import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { listMyLeads } from "@/lib/panel";
import { Mail, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/painel/leads")({
  component: PanelLeads,
});

function PanelLeads() {
  const { userId } = useAdmin();
  const leads = useQuery({ queryKey: ["panel-leads", userId], queryFn: () => listMyLeads(userId!), enabled: !!userId });
  const items = leads.data ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Leads recebidos</h1>
      <p className="text-sm text-muted-foreground">{items.length} contato(s) recebido(s) nas suas empresas.</p>

      <div className="mt-6 space-y-3">
        {leads.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Nenhum lead recebido ainda.</p>
          </div>
        ) : items.map((l) => {
          const company = (l as { companies: { name: string; slug: string } }).companies;
          return (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">
                    para <Link to="/empresa/$slug" params={{ slug: company.slug }} className="underline">{company.name}</Link> · {new Date(l.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {l.phone ? <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Phone className="h-3 w-3" /> {l.phone}</a> : null}
                  {l.email ? <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Mail className="h-3 w-3" /> {l.email}</a> : null}
                  {l.phone ? <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary"><MessageCircle className="h-3 w-3" /> WhatsApp</a> : null}
                </div>
              </div>
              {l.message ? <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{l.message}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
