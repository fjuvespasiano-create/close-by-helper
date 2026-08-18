// Imagens do roteiro turístico isoladas do arquivo de rota para evitar
// problemas de code-splitting do TanStack Router (tsr-shared).
import cavernaAsset from "@/assets/roteiro-caverna.jpg.asset.json";
import gastronomiaAsset from "@/assets/roteiro-gastronomia.jpg.asset.json";
import ecoturismoAsset from "@/assets/roteiro-ecoturismo.jpg.asset.json";

export const cavernaImg: string = cavernaAsset.url;
export const gastronomiaImg: string = gastronomiaAsset.url;
export const ecoturismoImg: string = ecoturismoAsset.url;
