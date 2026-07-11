import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, Siren } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { fetchEmergencyContacts, fetchPublicServices } from "@/lib/publicServices";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import { CitySwitch } from "@/components/site/CitySwitch";

export const Route = createFileRoute("/emergencia")({
  head: () => ({
    meta: [
      { title: "Emergência 24h — Telefones úteis | App da Cidade" },
      { name: "description", content: "SAMU 192, Bombeiros 193, Polícia 190 e serviços 24h em Vespasiano e São José da Lapa." },
      { property: "og:title", content: "Emergência 24h" },
      { property: "og:description", content: "Todos os telefones de emergência em um só lugar." },
    ],
  }),
  component: EmergenciaPage,
});

function EmergenciaPage() {
  const { city } = useSelectedCity();
  const contacts = useQuery({
    queryKey: ["emergency-contacts", city],
    queryFn: () => fetchEmergencyContacts(city),
  });
  const services24h = useQuery({
    queryKey: ["public-services-24h", city],
    queryFn: () => fetchPublicServices({ citySlug: city }),
    select: (rows) => rows.filter((r) => r.is_24h),
  });

  return (
    <SiteLayout>
      <section className="bg-destructive text-destructive-foreground">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-10 text-center">
          <Siren className="h-10 w-10" />
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">Emergência</h1>
          <p className="max-w-xl text-sm text-destructive-foreground/90 md:text-base">
            Em caso de risco de vida, ligue imediatamente. Toque em um número para chamar.
          </p>
          <div className="mt-2"><CitySwitch onDark /></div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <h2 className="font-display text-xl font-bold md:text-2xl">Telefones de emergência</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(contacts.data ?? []).map((c) => (
            <a
              key={c.id}
              href={`tel:${c.phone.replace(/\D/g, "")}`}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-destructive/40 hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <CategoryIcon name={c.icon} className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-muted-foreground">{c.name}</div>
                <div className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                  {c.phone}
                </div>
                {c.description ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">{c.description}</div>
                ) : null}
              </div>
              <Phone className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
            </a>
          ))}
          {contacts.isLoading ? <div className="text-sm text-muted-foreground">Carregando…</div> : null}
        </div>

        <h2 className="mt-12 font-display text-xl font-bold md:text-2xl">Atendimento 24h na cidade</h2>
        <p className="text-sm text-muted-foreground">Unidades de saúde e serviços com plantão.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(services24h.data ?? []).map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.subtype ?? "Serviço 24h"}
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">{s.name}</h3>
                  {s.address ? <p className="mt-1 text-sm text-muted-foreground">{s.address}</p> : null}
                </div>
                {s.phone ? (
                  <a
                    href={`tel:${s.phone.replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Phone className="h-4 w-4" /> Ligar
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {(services24h.data ?? []).length === 0 && !services24h.isLoading ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Nenhum serviço 24h cadastrado ainda para esta cidade.
            </div>
          ) : null}
        </div>
      </section>
    </SiteLayout>
  );
}
