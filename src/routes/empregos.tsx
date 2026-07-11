import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/empregos")({
  head: () => ({
    meta: [
      { title: "Empregos — AgendaAqui" },
      { name: "description", content: "Vagas de emprego e oportunidades na sua cidade. Em breve no AgendaAqui." },
      { property: "og:title", content: "Empregos — AgendaAqui" },
      { property: "og:description", content: "Vagas de emprego e oportunidades na sua cidade." },
    ],
  }),
  component: EmpregosPage,
});

function EmpregosPage() {
  return (
    <ComingSoon
      emoji="💼"
      title="Vagas e oportunidades"
      description="Um mural de empregos local, gratuito para quem procura e simples para as empresas que contratam."
    />
  );
}
