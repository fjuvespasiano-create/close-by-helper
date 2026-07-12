import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquarePlus, X, Loader2, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createUserRequest } from "@/lib/user-requests.functions";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "duvida", label: "Dúvida" },
  { value: "sugestao", label: "Sugestão" },
  { value: "parceria", label: "Parceria comercial" },
  { value: "orcamento", label: "Orçamento" },
  { value: "cadastro_empresa", label: "Cadastro de empresa" },
  { value: "cadastro_evento", label: "Cadastro de evento" },
  { value: "imprensa", label: "Imprensa" },
  { value: "elogio", label: "Elogio" },
  { value: "reclamacao", label: "Reclamação" },
  { value: "outro", label: "Outro" },
];

export function RequestFormButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("duvida");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const create = useServerFn(createUserRequest);

  async function openDialog() {
    setDone(null);
    try {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (u) {
        setName((n) => n || (u.user_metadata?.name as string | undefined) || "");
        setEmail((e) => e || u.email || "");
      }
    } catch {
      /* silencioso */
    }
    setOpen(true);
  }

  async function submit() {
    if (subject.trim().length < 3) return toast.error("Informe um assunto (mínimo 3 caracteres).");
    if (description.trim().length < 5) return toast.error("Descreva sua solicitação (mínimo 5 caracteres).");
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          category: category as never,
          subject: subject.trim(),
          description: description.trim(),
          page_url: typeof window !== "undefined" ? window.location.href : null,
          user_name: name.trim() || null,
          user_email: email.trim() || null,
          user_phone: phone.trim() || null,
          extra: {
            path: typeof window !== "undefined" ? window.location.pathname : null,
          },
        },
      });
      setDone(res.request_number);
      setSubject("");
      setDescription("");
      setPhone("");
    } catch (e) {
      toast.error("Não consegui enviar a solicitação.", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Enviar solicitação ou pedido"
        title="Enviar solicitação ou pedido"
        className="fixed bottom-20 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg ring-2 ring-secondary/30 transition hover:scale-105 hover:bg-secondary/90 md:h-14 md:w-14"
      >
        <MessageSquarePlus className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Enviar solicitação</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <p className="mt-3 text-lg font-semibold">Solicitação enviada!</p>
                <p className="text-sm text-muted-foreground">
                  Protocolo <span className="font-mono">{done}</span>. Nossa equipe entrará em
                  contato pelo canal informado.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Envie uma dúvida, sugestão, parceria ou pedido. Respondemos em até 48h úteis.
                </p>

                <div>
                  <label className="mb-1 block text-sm font-medium">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Assunto</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                    placeholder="Ex.: Quero cadastrar minha empresa"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder="Conte com detalhes o que você precisa…"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    {description.length}/5000
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Seu nome</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">WhatsApp / telefone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={30}
                      placeholder="(31) 9…"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={320}
                    placeholder="voce@exemplo.com"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar solicitação
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
