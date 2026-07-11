import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListLeads, adminListPlanLeads } from "@/lib/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/leads")({
  component: AdminLeads,
});

function AdminLeads() {
  const leads = useQuery({ queryKey: ["admin-leads"], queryFn: adminListLeads });
  const plans = useQuery({ queryKey: ["admin-plan-leads"], queryFn: adminListPlanLeads });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Leads</h1>
      <Tabs defaultValue="orcamentos" className="mt-4">
        <TabsList>
          <TabsTrigger value="orcamentos">Orçamentos ({leads.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="planos">Planos ({plans.data?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="orcamentos">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {(leads.data ?? []).map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{(l as { companies?: { name: string } }).companies?.name ?? "—"}</td>
                    <td className="px-4 py-3">{l.name}</td>
                    <td className="px-4 py-3">{l.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="planos">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {(plans.data ?? []).map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{l.company_name}</td>
                    <td className="px-4 py-3">{l.contact_name}</td>
                    <td className="px-4 py-3"><span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{l.plan}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{l.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
