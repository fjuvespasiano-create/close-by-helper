// Converte uma URL possivelmente relativa em absoluta usando `base`.
// Retorna `null` para entradas vazias ou inválidas.
export function absolutize(
  url: string | null | undefined,
  base: string,
): string | null {
  if (!url) return null;
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}
