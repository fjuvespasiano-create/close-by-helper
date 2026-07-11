import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/promocoes")({
  head: () => ({
    meta: [
      { title: "Promoções — AgenddaAqui" },
      { name: "description", content: "Ofertas e descontos das empresas da sua cidade. Em breve." },
      { property: "og:title", content: "Promoções — AgenddaAqui" },
      { property: "og:description", content: "Ofertas e descontos das empresas da sua cidade." },
    ],
  }),
  component: PromocoesPage,
});

function PromocoesPage() {
  return (
    <ComingSoon
      emoji="📢"
      title="Promoções perto de você"
      description="Descontos exclusivos das empresas parceiras, atualizados em tempo real e organizados por cidade e categoria."
    />
  );
}
