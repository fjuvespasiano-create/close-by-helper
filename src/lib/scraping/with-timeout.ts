// Rejeita a promise após `ms` milissegundos com uma mensagem de erro descritiva.
// Útil para envolver chamadas externas (Firecrawl, HTTP) sem depender de AbortController.
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms),
    ),
  ]);
}
