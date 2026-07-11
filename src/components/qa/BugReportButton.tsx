import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bug, X, Camera, Loader2, CheckCircle2, Video, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createQaTicket } from "@/lib/qa.functions";
import { collectDeviceInfo, getQaBuffers, installQaCapture } from "@/lib/qa-capture";
import { useSelectedCity } from "@/hooks/useSelectedCity";

const TYPES: { value: string; label: string }[] = [
  { value: "erro", label: "Erro" },
  { value: "bug", label: "Bug" },
  { value: "info_incorreta", label: "Informação incorreta" },
  { value: "empresa", label: "Empresa" },
  { value: "evento", label: "Evento" },
  { value: "noticia", label: "Notícia" },
  { value: "layout", label: "Layout / visual" },
  { value: "lentidao", label: "Lentidão" },
  { value: "funcionalidade", label: "Funcionalidade" },
  { value: "sugestao", label: "Sugestão" },
  { value: "outro", label: "Outro" },
];

type FileAttachment = { file: Blob; name: string; kind: "image" | "video" };

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("bug");
  const [description, setDescription] = useState("");
  const [attach, setAttach] = useState<FileAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [captureShot, setCaptureShot] = useState(true);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const { city } = useSelectedCity();
  const createTicket = useServerFn(createQaTicket);

  useEffect(() => {
    installQaCapture();
  }, []);

  useEffect(() => {
    if (!attach) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(attach.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attach]);

  async function handleScreenshot() {
    try {
      setOpen(false);
      await new Promise((r) => setTimeout(r, 250));
      const mod = await import("html2canvas");
      const canvas = await mod.default(document.body, {
        useCORS: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio, 2),
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao capturar"))), "image/png", 0.9),
      );
      setAttach({ file: blob, name: `screenshot-${Date.now()}.png`, kind: "image" });
      setOpen(true);
    } catch (e) {
      toast.error("Não consegui capturar a tela.", { description: (e as Error).message });
      setOpen(true);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "video/webm" });
        setAttach({ file: blob, name: `gravacao-${Date.now()}.webm`, kind: "video" });
        setRecording(false);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Não foi possível iniciar a gravação.", { description: (e as Error).message });
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function uploadAttachment(a: FileAttachment): Promise<string | null> {
    const ext = a.kind === "image" ? "png" : "webm";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("qa-attachments")
      .upload(path, a.file, { contentType: a.kind === "image" ? "image/png" : "video/webm", upsert: false });
    if (error) {
      console.warn("[qa] upload falhou", error);
      return null;
    }
    return path;
  }

  async function submit() {
    if (description.trim().length < 3) {
      toast.error("Descreva o problema (mínimo 3 caracteres).");
      return;
    }
    setSubmitting(true);
    try {
      let screenshot_url: string | null = null;
      let video_url: string | null = null;

      if (attach) {
        const path = await uploadAttachment(attach);
        if (path && attach.kind === "image") screenshot_url = path;
        if (path && attach.kind === "video") video_url = path;
      } else if (captureShot) {
        try {
          const mod = await import("html2canvas");
          const canvas = await mod.default(document.body, {
            useCORS: true,
            logging: false,
            scale: 1,
          });
          const blob: Blob = await new Promise((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("no blob"))), "image/jpeg", 0.7),
          );
          const path = await uploadAttachment({ file: blob, name: "auto.jpg", kind: "image" });
          if (path) screenshot_url = path;
        } catch {
          /* silencioso */
        }
      }

      const { data: sess } = await supabase.auth.getUser();
      const user = sess.user;
      const buffers = getQaBuffers();

      const res = await createTicket({
        data: {
          type: type as never,
          description: description.trim(),
          page_url: window.location.href,
          page_title: document.title,
          city_id: null,
          device: collectDeviceInfo(),
          console_logs: buffers.logs,
          network_logs: buffers.net,
          screenshot_url: screenshot_url
            ? // guardamos o path relativo em screenshot_url; server assina depois
              screenshot_url
            : null,
          video_url,
          user_name: (user?.user_metadata?.name as string | undefined) ?? null,
          user_email: user?.email ?? null,
          extra: {
            path: window.location.pathname,
            authed: !!user,
            city_slug: city,
          },
        },
      });

      setDone(res.ticket_number);
      setDescription("");
      setAttach(null);
    } catch (e) {
      toast.error("Não consegui enviar o reporte.", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDone(null);
          setOpen(true);
        }}
        aria-label="Reportar problema"
        title="Encontrou algum problema? Reportar"
        className="fixed bottom-4 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20 transition hover:scale-105 hover:bg-primary/90 md:h-14 md:w-14"
      >
        <Bug className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Reportar problema</h2>
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
                <p className="mt-3 text-lg font-semibold">Obrigado!</p>
                <p className="text-sm text-muted-foreground">
                  Ticket <span className="font-mono">{done}</span> recebido. Você receberá uma
                  notificação quando for resolvido.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Tipo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">O que aconteceu?</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    placeholder="Descreva o problema, o que esperava, e o que aconteceu…"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    maxLength={5000}
                  />
                  <div className="mt-1 text-right text-xs text-muted-foreground">
                    {description.length}/5000
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAttach({ file: f, name: f.name, kind: "image" });
                      }}
                    />
                    Anexar imagem
                  </label>
                  <button
                    type="button"
                    onClick={handleScreenshot}
                    className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    <Camera className="h-4 w-4" /> Capturar tela
                  </button>
                  {!recording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted"
                    >
                      <Video className="h-4 w-4" /> Gravar tela
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-2 rounded-md border border-red-500 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-200"
                    >
                      <Square className="h-4 w-4" /> Parar gravação
                    </button>
                  )}
                </div>

                {previewUrl && attach && (
                  <div className="rounded-md border p-2">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{attach.name}</span>
                      <button onClick={() => setAttach(null)} className="text-red-600 hover:underline">
                        remover
                      </button>
                    </div>
                    {attach.kind === "image" ? (
                      <img src={previewUrl} alt="prévia" className="max-h-40 w-full object-contain" />
                    ) : (
                      <video src={previewUrl} controls className="max-h-40 w-full" />
                    )}
                  </div>
                )}

                {!attach && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={captureShot}
                      onChange={(e) => setCaptureShot(e.target.checked)}
                    />
                    Capturar screenshot automaticamente
                  </label>
                )}

                <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  Coletamos automaticamente URL, dispositivo, navegador e últimos erros do console.
                </div>

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
                  Enviar reporte
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
