import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createCompanyClaim } from "@/lib/company-claims.functions";

const schema = z.object({
  role_requested: z.enum(["owner", "collaborator"]),
  full_name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  position: z.string().trim().max(120).optional(),
  corporate_email: z.string().trim().email("E-mail inválido").max(320).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  justification: z.string().trim().min(20, "Descreva com pelo menos 20 caracteres").max(2000),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  companyName: string;
  userId: string;
  onSubmitted?: () => void;
};

export function ClaimCompanyDialog({ open, onOpenChange, companyId, companyName, userId, onSubmitted }: Props) {
  const [form, setForm] = useState({
    role_requested: "owner" as "owner" | "collaborator",
    full_name: "",
    position: "",
    corporate_email: "",
    phone: "",
    justification: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = useServerFn(createCompanyClaim);

  const m = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      let evidence_url: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Arquivo maior que 5MB");
        setUploading(true);
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${userId}/${companyId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("claim-evidence").upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        setUploading(false);
        if (upErr) throw new Error(`Falha no upload: ${upErr.message}`);
        evidence_url = path;
      }

      await submit({
        data: {
          company_id: companyId,
          role_requested: parsed.data.role_requested,
          full_name: parsed.data.full_name,
          position: parsed.data.position || null,
          corporate_email: parsed.data.corporate_email || null,
          phone: parsed.data.phone || null,
          justification: parsed.data.justification,
          evidence_url,
        },
      });
    },
    onSuccess: () => {
      toast.success("Reivindicação enviada! Nossa equipe analisará em breve.");
      onOpenChange(false);
      setForm({
        role_requested: "owner",
        full_name: "",
        position: "",
        corporate_email: "",
        phone: "",
        justification: "",
      });
      setFile(null);
      onSubmitted?.();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar reivindicação"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reivindicar {companyName}</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo. Nossa equipe verificará as informações antes de liberar o acesso ao painel de gestão.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Sua relação com a empresa</Label>
            <RadioGroup
              value={form.role_requested}
              onValueChange={(v) => setForm((f) => ({ ...f, role_requested: v as "owner" | "collaborator" }))}
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="owner" /> Sou o(a) dono(a)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="collaborator" /> Sou colaborador(a) autorizado(a)
              </label>
            </RadioGroup>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="Ex: Proprietário, Gerente"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="corporate_email">E-mail corporativo</Label>
              <Input
                id="corporate_email"
                type="email"
                value={form.corporate_email}
                onChange={(e) => setForm((f) => ({ ...f, corporate_email: e.target.value }))}
                placeholder="contato@suaempresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(31) 9 9999-9999"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              rows={4}
              value={form.justification}
              onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
              placeholder="Explique como você comprova ser responsável pela empresa (CNPJ, cargo, redes oficiais, etc.)"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evidence">Comprovante (opcional, até 5MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="evidence"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ex: cartão CNPJ, contrato social, procuração, comprovante de vínculo.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={m.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={m.isPending || uploading}>
              {(m.isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar reivindicação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
