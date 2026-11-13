// Gera src/data/catalogo.json a partir de um export de Products do Matrixify (CSV).
// Uso: node scripts/build-catalog.mjs <caminho/Products.csv>
//
// Inclui apenas produtos ativos de capas/proteção de sofá. Não guarda stock.

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Uso: node scripts/build-catalog.mjs <Products.csv>");
  process.exit(1);
}

const TIPOS = new Set(["Capas para Sofá", "Capas para Almofada"]);
// Produtos do tipo "Capas para Sofá" que não são capas de sofá.
const EXCLUIR = new Set(["tapete-wc-impermeavel-para-animais"]);
const LOJA = "https://plurata.pt/products/";

const rows = parse(fs.readFileSync(csvPath), { columns: true, bom: true, skip_empty_lines: true });

const porId = new Map();
for (const r of rows) {
  if (!porId.has(r.ID)) porId.set(r.ID, []);
  porId.get(r.ID).push(r);
}

const textoDe = (html) =>
  html
    .replace(/<(br|\/p|\/li|\/tr|\/h\d)[^>]*>/gi, "\n")
    .replace(/<t[dh][^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

const ehCor = (nome) => /^cor/i.test(nome);

const produtos = [];
for (const linhas of porId.values()) {
  const p = linhas[0];
  if (p.Status !== "Active" || !TIPOS.has(p.Type) || EXCLUIR.has(p.Handle)) continue;

  const opcoes = [1, 2, 3]
    .map((i) => ({ nome: p[`Option${i} Name`], i }))
    .filter((o) => o.nome && o.nome !== "Title");
  const valores = (i) => [...new Set(linhas.map((l) => l[`Option${i} Value`]).filter(Boolean))];

  const cores = opcoes.filter((o) => ehCor(o.nome)).flatMap((o) => valores(o.i));
  const variantesTamanho = opcoes
    .filter((o) => !ehCor(o.nome))
    .map((o) => ({ opcao: o.nome, valores: valores(o.i) }));

  // Preço por tamanho (mínimo entre cores).
  const precos = {};
  const opTam = opcoes.find((o) => !ehCor(o.nome));
  for (const l of linhas) {
    const preco = parseFloat(l["Variant Price"]);
    if (Number.isNaN(preco)) continue;
    const chave = opTam ? l[`Option${opTam.i} Value`] : "único";
    if (!chave) continue;
    precos[chave] = Math.min(precos[chave] ?? Infinity, preco);
  }

  const imagemPrincipal = linhas.find((l) => l["Image Position"] === "1")?.["Image Src"] || linhas.find((l) => l["Image Src"])?.["Image Src"] || null;
  const imagensDescricao = [...p["Body HTML"].matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) =>
    m[1].startsWith("//") ? `https:${m[1]}` : m[1],
  );

  produtos.push({
    handle: p.Handle,
    titulo: p.Title,
    url: LOJA + p.Handle,
    tipo: p.Type,
    tags: p.Tags,
    imagem: imagemPrincipal,
    cores,
    tamanhos: variantesTamanho,
    precoPorTamanho: precos,
    descricao: textoDe(p["Body HTML"]).slice(0, 4000),
    imagensDescricao,
  });
}

produtos.sort((a, b) => a.handle.localeCompare(b.handle));
const out = path.join("src", "data", "catalogo.json");
fs.writeFileSync(out, JSON.stringify(produtos, null, 2) + "\n");
console.log(`${produtos.length} produtos escritos em ${out}`);
