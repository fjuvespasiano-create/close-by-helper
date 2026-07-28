import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shopee-feeds")({
  head: () => ({
    meta: [
      { title: "Feeds Shopee Afiliados — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShopeeFeedsPage,
});

type Feed = {
  id: string;
  name: string;
  description: string;
  url: string;
};

const FEEDS: Feed[] = [
  {
    id: "feed-1",
    name: "Datafeed Shopee — Feed Principal",
    description: "Catálogo principal de produtos Shopee (CSV completo).",
    url: "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcFMjz35zY_7hscVJ_4QLIFiIR3DQ9hsrLcX6rgIVVFkb",
  },
  {
    id: "feed-2",
    name: "Datafeed Shopee — Feed Secundário",
    description: "Segundo datafeed configurado no Portal de Afiliados Shopee.",
    url: "https://affiliate.shopee.com.br/api/v1/datafeed/download?id=YWJjZGVmZ2hpamtsbW5vcPNcbnfdFhhQkoz1FtnUm6DtED25ejObtofpYLqHBC0h",
  },
];

function ShopeeFeedsPage() {
  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado"),
      () => toast.error("Não foi possível copiar"),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShoppingBag className="h-6 w-6 text-orange-500" />
            Feeds Shopee Afiliados
          </h1>
          <p className="text-sm text-muted-foreground">
            Baixe os CSVs completos gerados pela Shopee. Use estes arquivos para atualizar o catálogo local ou analisar produtos.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {FEEDS.map((feed) => (
          <Card key={feed.id} className="border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-base">{feed.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{feed.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="break-all rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                {feed.url}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="bg-orange-500 text-white hover:bg-orange-600">
                  <a href={feed.url} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-1 h-4 w-4" /> Baixar CSV
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={feed.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" /> Abrir em nova aba
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copyUrl(feed.url)}>
                  Copiar link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Dica:</strong> Os links são gerados pelo Portal de Afiliados Shopee e permanecem válidos enquanto o feed estiver ativo. Se o download falhar com "acesso negado", regenere o link no painel da Shopee e nos avise para atualizar aqui.
      </div>
    </div>
  );
}
