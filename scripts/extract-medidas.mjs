// Lê as tabelas de medidas (texto e imagens das descrições) de cada produto do catálogo
// com o Claude e grava os intervalos em src/data/medidas.json, para revisão humana.
//
// Uso: ANTHROPIC_API_KEY=... node scripts/extract-medidas.mjs [handle ...]
//   Atrás de uma proxy HTTP, acrescente NODE_USE_ENV_PROXY=1 para o fetch das imagens a usar.
//   Sem handles, processa todos os produtos que ainda não estão em medidas.json.
//   Com handles, (re)processa só esses.

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const CATALOGO = "src/data/catalogo.json";
const MEDIDAS = "src/data/medidas.json";

const Intervalo = z.object({
  minCm: z.number().nullable(),
  maxCm: z.number().nullable(),
});

const MedidasProduto = z.object({
  medidaPrincipal: z
    .string()
    .describe("Que medida do sofá a tabela usa para escolher o tamanho, ex.: 'largura total do sofá, de braço a braço'"),
  tamanhos: z.array(
    z.object({
      tamanho: z.string().describe("Só o valor exato da variante (ex.: '2 Lugares'), sem o nome da opção"),
      largura: Intervalo.describe("Intervalo da largura/comprimento total do sofá que este tamanho serve"),
      profundidade: Intervalo.describe("Intervalo de profundidade, se indicado"),
      outras: z.string().nullable().describe("Outras medidas ou restrições indicadas para este tamanho"),
      fonte: z.enum(["imagem", "texto", "titulo", "nao_encontrado"]),
    }),
  ),
  notas: z.string().describe("Regras de escolha indicadas (ex.: 'se estiver perto do máximo, escolha o tamanho seguinte'), lado da chaise longue, etc."),
});

const SYSTEM = `És um assistente que extrai tabelas de medidas de capas de sofá de uma loja portuguesa.
Recebes a descrição de um produto, a lista exata das variantes de tamanho e as imagens da descrição (algumas são tabelas de medidas, outras são fotos).
Para cada variante de tamanho, indica os intervalos em centímetros que a tabela dá. Usa apenas o que está escrito no texto, no título ou nas imagens; nunca inventes nem estimes valores.
Se um tamanho não tiver medidas visíveis, usa null e fonte "nao_encontrado".
Se o produto não tiver variantes de tamanho (tamanho único), devolve uma entrada com tamanho "único" e as medidas que encontrares.`;

const client = new Anthropic();
const catalogo = JSON.parse(fs.readFileSync(CATALOGO, "utf8"));
const medidas = fs.existsSync(MEDIDAS) ? JSON.parse(fs.readFileSync(MEDIDAS, "utf8")) : {};

const pedidos = process.argv.slice(2);
const alvo = pedidos.length
  ? catalogo.filter((p) => pedidos.includes(p.handle))
  : catalogo.filter((p) => !medidas[p.handle]);

const TIPOS_IMAGEM = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

// Descarrega a imagem e devolve-a em base64 (a API pode não aceitar URLs em todos os ambientes).
async function imagemBase64(url) {
  try {
    const r = await fetch(url);
    const tipo = (r.headers.get("content-type") || "").split(";")[0];
    if (!r.ok || !TIPOS_IMAGEM.has(tipo)) return null;
    const dados = Buffer.from(await r.arrayBuffer());
    if (dados.length > 5 * 1024 * 1024) return null;
    return { type: "image", source: { type: "base64", media_type: tipo, data: dados.toString("base64") } };
  } catch {
    return null;
  }
}

for (const p of alvo) {
  const tamanhos = p.tamanhos.flatMap((t) => t.valores.map((v) => `${t.opcao}: ${v}`));
  const imagens = (await Promise.all(p.imagensDescricao.slice(0, 12).map(imagemBase64))).filter(Boolean);
  const content = [
    ...imagens,
    {
      type: "text",
      text: `Produto: ${p.titulo}\nVariantes de tamanho:\n${tamanhos.length ? tamanhos.join("\n") : "(tamanho único)"}\n\nDescrição:\n${p.descricao}`,
    },
  ];

  try {
    const resposta = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(MedidasProduto) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    if (resposta.stop_reason === "refusal" || !resposta.parsed_output) {
      console.warn(`✗ ${p.handle}: sem resposta válida (${resposta.stop_reason})`);
      continue;
    }
    medidas[p.handle] = { ...resposta.parsed_output, revisto: false };
    fs.writeFileSync(MEDIDAS, JSON.stringify(medidas, null, 2) + "\n");
    const encontrados = resposta.parsed_output.tamanhos.filter((t) => t.fonte !== "nao_encontrado").length;
    console.log(`✓ ${p.handle}: ${encontrados}/${resposta.parsed_output.tamanhos.length} tamanhos com medidas (${imagens.length}/${p.imagensDescricao.length} imagens lidas)`);
  } catch (erro) {
    if (erro instanceof Anthropic.APIError) {
      console.warn(`✗ ${p.handle}: erro ${erro.status} ${erro.message}`);
    } else {
      throw erro;
    }
  }
}
