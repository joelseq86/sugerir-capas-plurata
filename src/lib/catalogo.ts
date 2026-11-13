import catalogoJson from "@/data/catalogo.json";
import medidasJson from "@/data/medidas.json";

type Intervalo = { minCm: number | null; maxCm: number | null };

export type Produto = {
  handle: string;
  titulo: string;
  url: string;
  tipo: string;
  tags: string;
  imagem: string | null;
  cores: string[];
  tamanhos: { opcao: string; valores: string[] }[];
  precoPorTamanho: Record<string, number>;
  descricao: string;
  imagensDescricao: string[];
};

export type MedidasProduto = {
  medidaPrincipal: string;
  tamanhos: {
    tamanho: string;
    largura: Intervalo;
    profundidade: Intervalo;
    outras: string | null;
    fonte: string;
  }[];
  notas: string;
  revisto: boolean;
};

export const catalogo = catalogoJson as unknown as Produto[];
export const medidas = medidasJson as unknown as Record<string, MedidasProduto>;
export const porHandle = new Map(catalogo.map((p) => [p.handle, p]));

const intervalo = (i: Intervalo) =>
  i.minCm == null && i.maxCm == null ? null : `${i.minCm ?? "?"}–${i.maxCm ?? "?"} cm`;

// Texto do catálogo enviado ao Claude. Deve ser determinístico (ordem fixa) para o cache funcionar.
export function catalogoParaPrompt(): string {
  return catalogo
    .map((p) => {
      const m = medidas[p.handle];
      const linhas = [`## ${p.titulo}`, `handle: ${p.handle}`];
      for (const t of p.tamanhos) linhas.push(`opção "${t.opcao}": ${t.valores.join(" | ")}`);
      const precos = Object.entries(p.precoPorTamanho)
        .map(([k, v]) => `${k} €${v.toFixed(2)}`)
        .join("; ");
      if (precos) linhas.push(`preços: ${precos}`);
      if (m) {
        linhas.push(`medida usada na tabela: ${m.medidaPrincipal}`);
        for (const t of m.tamanhos) {
          const partes = [
            intervalo(t.largura) && `largura ${intervalo(t.largura)}`,
            intervalo(t.profundidade) && `profundidade ${intervalo(t.profundidade)}`,
            t.outras,
          ].filter(Boolean);
          linhas.push(`- ${t.tamanho}: ${partes.length ? partes.join("; ") : "sem medidas publicadas"}`);
        }
        if (m.notas) linhas.push(`notas: ${m.notas}`);
      } else {
        linhas.push("medidas: não disponíveis");
      }
      linhas.push(`descrição: ${p.descricao.slice(0, 700).replace(/\n/g, " ")}`);
      return linhas.join("\n");
    })
    .join("\n\n");
}
