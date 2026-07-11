import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchRepresentative,
  fetchActivitiesByRepresentative,
  fetchAttendance,
  KIND_META,
  STATUS_LABEL,
  ROLE_LABEL,
} from "@/lib/representatives";
import { ExternalLink, Mail, Phone, Instagram, Facebook, Twitter, Globe } from "lucide-react";

export const Route = createFileRoute("/representantes/$id")({
  loader: async ({ params }) => {
    const rep = await fetchRepresentative(params.id);
    if (!rep) throw notFound();
    return rep;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} — ${ROLE_LABEL[loaderData.role]} | AgenddaAqui` },
          {
            name: "description",
            content:
              loaderData.bio?.slice(0, 155) ??
              `Acompanhe as ações de ${loaderData.name}, ${ROLE_LABEL[loaderData.role]}. Projetos, decretos e presenças em tempo real.`,
          },
          { property: "og:title", content: `${loaderData.name} — ${ROLE_LABEL[loaderData.role]}` },
          { property: "og:type", content: "profile" },
          ...(loaderData.photo_url ? [{ property: "og:image", content: loaderData.photo_url }] : []),
        ]
      : [],
  }),
  errorComponent: () => (
    <SiteLayout>
      <div className="container py-12 text-center text-muted-foreground">Não foi possível carregar este representante.</div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container py-12 text-center">
        <div className="text-muted-foreground mb-4">Representante não encontrado.</div>
        <Button asChild variant="outline"><Link to="/representantes">← Ver todos</Link></Button>
      </div>
    </SiteLayout>
  ),
  component: RepresentativePage,
});

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function RepresentativePage() {
  const rep = Route.useLoaderData();

  const { data: activities = [] } = useQuery({
    queryKey: ["rep-activities", rep.id],
    queryFn: () => fetchActivitiesByRepresentative(rep.id),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["rep-attendance", rep.id],
    queryFn: () => fetchAttendance(rep.id),
  });

  const totalSessions = attendance.length;
  const present = attendance.filter((a) => a.present).length;
  const rate = totalSessions ? Math.round((present / totalSessions) * 100) : 0;

  const projetos = activities.filter((a) => a.kind === "projeto_lei");

  const socials = rep.social_links ?? {};

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container py-8">
          <div className="text-xs text-muted-foreground mb-3">
            <Link to="/representantes" className="hover:text-primary">← Representantes</Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            {rep.photo_url ? (
              <img
                src={rep.photo_url}
                alt={rep.name}
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-background shadow-md"
              />
            ) : (
              <div className="h-28 w-28 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold ring-4 ring-background shadow-md">
                {initials(rep.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">{rep.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge>{ROLE_LABEL[rep.role as keyof typeof ROLE_LABEL]}</Badge>
                {rep.party && <Badge variant="secondary">{rep.party}</Badge>}
              </div>
              {rep.bio && <p className="text-muted-foreground mt-3 max-w-2xl">{rep.bio}</p>}
              <div className="flex flex-wrap gap-3 mt-4 text-sm">
                {rep.email && (
                  <a href={`mailto:${rep.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Mail className="h-4 w-4" /> {rep.email}
                  </a>
                )}
                {rep.phone && (
                  <a href={`tel:${rep.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Phone className="h-4 w-4" /> {rep.phone}
                  </a>
                )}
                {socials.instagram && (
                  <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Instagram className="h-4 w-4" /> Instagram
                  </a>
                )}
                {socials.facebook && (
                  <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Facebook className="h-4 w-4" /> Facebook
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Twitter className="h-4 w-4" /> Twitter
                  </a>
                )}
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Globe className="h-4 w-4" /> Site
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-8">
        <Tabs defaultValue="atividades">
          <TabsList>
            <TabsTrigger value="atividades">Atividades ({activities.length})</TabsTrigger>
            <TabsTrigger value="projetos">Projetos ({projetos.length})</TabsTrigger>
            <TabsTrigger value="assiduidade">Assiduidade</TabsTrigger>
          </TabsList>

          <TabsContent value="atividades" className="mt-6">
            {activities.length === 0 ? (
              <EmptyMsg text="Ainda não há atividades registradas para este representante." />
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => {
                  const meta = KIND_META[a.kind] ?? KIND_META.outro;
                  return (
                    <li key={a.id}>
                      <Card>
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-lg ${meta.color}`}>{meta.emoji}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                                {a.status && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[a.status]}</Badge>}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(a.occurred_at).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <div className="font-medium">{a.title}</div>
                              {a.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{a.description}</p>}
                              {a.source_url && (
                                <a href={a.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                                  Fonte oficial <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="projetos" className="mt-6">
            {projetos.length === 0 ? (
              <EmptyMsg text="Nenhum projeto de lei registrado." />
            ) : (
              <ul className="space-y-3">
                {projetos.map((p) => (
                  <li key={p.id}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">📜</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{p.title}</div>
                            {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              {p.status && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[p.status]}</Badge>}
                              <span className="text-xs text-muted-foreground">{new Date(p.occurred_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="assiduidade" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {totalSessions === 0 ? (
                  <EmptyMsg text="Ainda não há registros de sessões plenárias importadas." />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <StatBox label="Presença" value={`${rate}%`} tone="good" />
                      <StatBox label="Sessões" value={totalSessions.toString()} />
                      <StatBox label="Faltas" value={(totalSessions - present).toString()} tone="bad" />
                    </div>
                    <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Baseado nas últimas {totalSessions} sessões registradas.</div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </SiteLayout>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function StatBox({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "bad" ? "text-red-600 dark:text-red-400" : "";
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
