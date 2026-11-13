import { z } from "zod";

export const TIPOS_SOFA = {
  sofa: "Sofá normal (com braços)",
  sofa_sem_bracos: "Sofá sem braços / futon",
  chaise_longue: "Sofá com chaise longue",
  canto: "Sofá de canto (em L)",
  relax: "Sofá relax / reclinável",
  clic_clac: "Sofá-cama clic-clac",
  poltrona: "Poltrona / cadeirão",
  puff: "Puff",
} as const;

export const PREFERENCIAS = {
  impermeavel: "Impermeável / repelente de líquidos",
  animais: "Tenho animais",
  criancas: "Tenho crianças",
  ajustada: "Ajustada (elástica, como uma segunda pele)",
  acolchoada: "Acolchoada / tipo manta por cima",
  veludo: "Toque de veludo",
  economica: "Opção mais económica",
} as const;

const cm = (max: number) => z.number().positive().max(max);

export const PedidoSugestao = z.object({
  tipo: z.enum(Object.keys(TIPOS_SOFA) as [keyof typeof TIPOS_SOFA, ...(keyof typeof TIPOS_SOFA)[]]),
  lugares: z.number().int().min(1).max(8).nullable(),
  ladoChaise: z.enum(["direito", "esquerdo", "nao_sei"]).nullable(),
  bracoChaise: z.enum(["curto", "comprido", "nao_sei"]).nullable(),
  larguraCm: cm(600).nullable(),
  profundidadeCm: cm(400).nullable(),
  alturaEncostoCm: cm(200).nullable(),
  larguraBracoCm: cm(100).nullable(),
  comprimentoChaiseCm: cm(400).nullable(),
  larguraChaiseCm: cm(200).nullable(),
  comprimentoBracoChaiseCm: cm(250).nullable(),
  fotos: z
    .array(
      z.object({
        tipo: z.enum(["image/jpeg", "image/png", "image/webp"]),
        dados: z.string().max(1_000_000), // base64, reduzida no browser (máx. ~1 MB cada, para caber no limite de pedido)
      }),
    )
    .max(3),
  preferencias: z.array(z.enum(Object.keys(PREFERENCIAS) as [keyof typeof PREFERENCIAS, ...(keyof typeof PREFERENCIAS)[]])).max(7),
  observacoes: z.string().max(500),
});
export type PedidoSugestao = z.infer<typeof PedidoSugestao>;

export const temMedidasOuFotos = (p: PedidoSugestao) => p.larguraCm != null || p.fotos.length > 0;

// Formato que o Claude devolve.
export const RespostaClaude = z.object({
  identificacao: z
    .object({
      ladoChaise: z.enum(["direito", "esquerdo"]).nullable(),
      bracoChaise: z.enum(["curto", "comprido"]).nullable(),
      nota: z.string().describe("O que se identificou nas fotos ou se deduziu das medidas, para o cliente confirmar"),
    })
    .nullable()
    .describe("Só para chaise longue/canto quando o cliente não indicou o lado ou o braço; null caso contrário"),
  resumo: z.string().describe("1-2 frases para o cliente, em português de Portugal"),
  recomendacoes: z
    .array(
      z.object({
        handle: z.string().describe("Handle exato do produto no catálogo"),
        variante: z
          .array(z.string())
          .describe("Valores exatos das opções de tamanho/tipo a escolher (sem cores). Vazio se o produto não tiver opções de tamanho."),
        adequacao: z.enum(["ideal", "boa", "possivel"]),
        motivo: z.string().describe("Porque serve, citando as medidas do cliente e o intervalo do tamanho"),
      }),
    )
    .describe("Entre 1 e 4 capas, da mais aconselhada para a menos"),
  avisos: z.array(z.string()).describe("Medidas que convém confirmar ou cuidados na escolha"),
});
export type RespostaClaude = z.infer<typeof RespostaClaude>;

export type Recomendacao = RespostaClaude["recomendacoes"][number] & {
  titulo: string;
  url: string;
  imagem: string | null;
  preco: number | null;
};

export type RespostaSugestao = {
  identificacao: RespostaClaude["identificacao"];
  resumo: string;
  recomendacoes: Recomendacao[];
  avisos: string[];
};
