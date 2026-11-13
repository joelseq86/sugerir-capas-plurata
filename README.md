# Sugerir Capas · Plurata

Página onde o cliente indica o tipo e as medidas do sofá e recebe as capas da [Plurata](https://plurata.pt) aconselhadas, no tamanho certo, com o link para o produto. As sugestões são geradas pela API do Claude, com base no catálogo e nas tabelas de medidas de cada capa.

A app não consulta stock nem tem ligação a sistemas de faturação. Só usa o catálogo exportado da loja.

## Como funciona

1. **Catálogo** (`src/data/catalogo.json`): gerado a partir de um export de *Products* do Matrixify. Inclui apenas as capas de sofá/almofada ativas, com título, opções de tamanho, cores, preço por tamanho, descrição e imagens. Não inclui stock.
2. **Medidas** (`src/data/medidas.json`): o Claude lê as tabelas de medidas (texto e **imagens** das descrições) e regista os intervalos em cm de cada tamanho. Cada produto tem `"revisto": false` até alguém confirmar os valores.
3. **Sugestão** (`POST /api/sugerir`): envia ao Claude as medidas do cliente e o catálogo com as medidas. A resposta vem em JSON estruturado. O servidor descarta produtos ou tamanhos que não existam no catálogo e acrescenta o link, a imagem e o preço.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # e preencher ANTHROPIC_API_KEY
npm run dev
```

Abrir http://localhost:3000.

## Atualizar o catálogo

1. No Matrixify, exportar **Products** em CSV, com as colunas base, variantes e imagens.
2. Gerar o catálogo:

   ```bash
   node scripts/build-catalog.mjs caminho/para/Products.csv
   ```

3. Extrair as medidas dos produtos novos (os que ainda não estão em `medidas.json`):

   ```bash
   ANTHROPIC_API_KEY=... node scripts/extract-medidas.mjs
   ```

   Para refazer produtos específicos, passe os handles: `node scripts/extract-medidas.mjs capa-de-sofa-elastica-teide`.
   Atrás de uma proxy HTTP, acrescente `NODE_USE_ENV_PROXY=1`.

4. Rever `src/data/medidas.json` (corrigir valores e marcar `"revisto": true`) e fazer deploy.

## Notas

- Modelo: `claude-opus-5-5`, com *fallback* automático no servidor se um pedido for recusado (`fallbacks: "default"`).
- O catálogo vai no *system prompt* com cache de 1 hora, para baixar o custo e o tempo de resposta.
- `/api/sugerir` tem um limite simples de 10 pedidos por IP a cada 10 minutos, guardado em memória. Com várias instâncias, convém trocar por um limite partilhado.
