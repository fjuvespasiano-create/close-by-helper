// Factory + guarda de configuração para o SDK Firecrawl.
// Sempre chame dentro do handler de um serverFn (nunca no top-level de
// `.functions.ts` — process.env é injetado por request no Worker).
export async function createFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada.");
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  return new Firecrawl({ apiKey });
}
