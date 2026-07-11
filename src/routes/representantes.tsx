import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/representantes")({
  head: () => ({
    meta: [
      { title: "Meus Representantes — Vespasiano e São José da Lapa | AgenddaAqui" },
      {
        name: "description",
        content:
          "O que seus vereadores e prefeitos estão fazendo agora? Acompanhe projetos, decretos, votos e obras em Vespasiano e São José da Lapa em um só lugar.",
      },
      { property: "og:title", content: "Meus Representantes — AgenddaAqui" },
      {
        property: "og:description",
        content: "Transparência legislativa e executiva. Feed, perfis e ranking dos políticos locais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Outlet />,
});
