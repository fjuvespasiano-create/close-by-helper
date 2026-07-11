import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DEFAULT_SITE_CONTENT,
  fetchSiteContent,
  saveSiteContent,
  type SiteContent,
} from "@/lib/siteContent";

export const Route = createFileRoute("/admin/textos")({
  component: AdminTextos,
});

type SectionKey = keyof SiteContent;

const SECTIONS: { key: SectionKey; label: string; description: string; longFields?: string[] }[] = [
  { key: "brand", label: "Marca", description: "Nome e subtítulo exibidos no cabeçalho e rodapé." },
  { key: "header", label: "Cabeçalho", description: "Botões e ações do menu superior." },
  { key: "footer", label: "Rodapé", description: "Textos das colunas e do rodapé inferior.", longFields: ["about_text"] },
  { key: "newsletter", label: "Newsletter", description: "Formulário de inscrição no rodapé.", longFields: ["description"] },
  { key: "home", label: "Home (Página inicial)", description: "Hero e chamada final da página inicial.", longFields: ["hero_subtitle", "cta_subtitle"] },
  { key: "about", label: "Página Sobre", description: "Título e parágrafos da página /sobre.", longFields: ["p1", "p2", "p3"] },
  { key: "contact", label: "Página Contato", description: "Título e informações de contato.", longFields: ["subtitle"] },
];

const FIELD_LABELS: Record<string, string> = {
  name: "Nome da marca",
  tagline: "Subtítulo",
  cta_label: "Botão principal (Anunciar)",
  panel_label: "Painel do usuário",
  admin_label: "Painel admin",
  login_label: "Entrar",
  logout_label: "Sair",
  about_text: "Texto institucional",
  nav_title: "Título da coluna Navegação",
  biz_title: "Título da coluna Para empresas",
  copyright: "Copyright (© {ano} é adicionado automaticamente)",
  location: "Localização",
  title: "Título",
  description: "Descrição",
  email_placeholder: "Placeholder do e-mail",
  name_placeholder: "Placeholder do nome",
  button_label: "Texto do botão",
  hero_overline: "Etiqueta acima do título",
  hero_title: "Título principal (hero)",
  hero_subtitle: "Subtítulo do hero",
  cta_title: "Título da chamada final",
  cta_subtitle: "Subtítulo da chamada final",
  cta_button: "Texto do botão da chamada",
  subtitle: "Subtítulo",
  p1: "Parágrafo 1",
  p2: "Parágrafo 2",
  p3: "Parágrafo 3",
  email: "E-mail de contato",
  whatsapp_url: "Link do WhatsApp (https://wa.me/...)",
  whatsapp_label: "Descrição do WhatsApp",
};

function AdminTextos() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["site-content-admin"], queryFn: fetchSiteContent });
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    if (data) setContent(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveSiteContent(content),
    onSuccess: () => {
      toast.success("Textos do site atualizados");
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: ["site-content-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setField(section: SectionKey, field: string, value: string) {
    setContent((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, string>), [field]: value },
    }));
  }

  function resetSection(section: SectionKey) {
    setContent((prev) => ({ ...prev, [section]: DEFAULT_SITE_CONTENT[section] } as SiteContent));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Textos do site</h1>
          <p className="text-sm text-muted-foreground">
            Edite o conteúdo exibido no cabeçalho, rodapé, home e páginas institucionais.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading} className="gap-1">
          <Save className="h-4 w-4" /> {save.isPending ? "Salvando…" : "Salvar tudo"}
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <Accordion type="multiple" defaultValue={["brand", "header"]} className="mt-6 space-y-3">
          {SECTIONS.map((sec) => {
            const values = content[sec.key] as Record<string, string>;
            return (
              <AccordionItem key={sec.key} value={sec.key} className="rounded-xl border border-border bg-card px-4">
                <AccordionTrigger className="text-left">
                  <div>
                    <div className="font-semibold">{sec.label}</div>
                    <div className="text-xs font-normal text-muted-foreground">{sec.description}</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid gap-4">
                    {Object.entries(values).map(([field, val]) => {
                      const isLong = sec.longFields?.includes(field);
                      return (
                        <div key={field} className="grid gap-1.5">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            {FIELD_LABELS[field] ?? field}
                          </Label>
                          {isLong ? (
                            <Textarea
                              rows={3}
                              value={val}
                              onChange={(e) => setField(sec.key, field, e.target.value)}
                            />
                          ) : (
                            <Input value={val} onChange={(e) => setField(sec.key, field, e.target.value)} />
                          )}
                        </div>
                      );
                    })}
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground"
                        onClick={() => resetSection(sec.key)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão desta seção
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
