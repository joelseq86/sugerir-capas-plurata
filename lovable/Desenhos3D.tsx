// Desenhos 3D em linha (perspetiva cavaleira) dos tipos de sofá, ao estilo das tabelas de medidas.
// Cores via CSS: o traço usa currentColor; o destaque usa var(--destaque) (cor primária da loja).
// Convenção: o cliente está de frente para o sofá; "direita" é a direita de quem olha.

import type { ReactNode } from "react";

type Caixa = {
  x: number; y: number; z: number; // canto inferior-esquerdo-frontal (x→direita, y→cima, z→fundo; z negativo = mais à frente)
  w: number; h: number; d: number;
  r?: number; // arredondamento visual das arestas (0–1, só estético)
  destaque?: "forte" | "suave";
};

const KX = 0.5; // deslocamento horizontal por unidade de profundidade
const KY = 0.3; // deslocamento vertical por unidade de profundidade
const P = (x: number, y: number, z: number): [number, number] => [x + z * KX, -y - z * KY];

function poligono(pts: [number, number][]) {
  return pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
}

// Ordem de desenho (pintor): o que está atrás primeiro; depois esquerda antes de direita; depois baixo antes de cima.
function antes(a: Caixa, b: Caixa): number {
  if (a.z >= b.z + b.d) return -1;
  if (b.z >= a.z + a.d) return 1;
  if (a.x + a.w <= b.x) return -1;
  if (b.x + b.w <= a.x) return 1;
  if (a.y + a.h <= b.y) return -1;
  if (b.y + b.h <= a.y) return 1;
  return 0;
}
function ordenar(cx: Caixa[]): Caixa[] {
  const resto = [...cx];
  const out: Caixa[] = [];
  while (resto.length) {
    const i = resto.findIndex((a) => resto.every((b) => a === b || antes(b, a) >= 0));
    out.push(...resto.splice(i === -1 ? 0 : i, 1));
  }
  return out;
}

function CaixaSvg({ c }: { c: Caixa }) {
  const { x, y, z, w, h, d } = c;
  const fill = c.destaque === "forte" ? "var(--destaque)" : c.destaque === "suave" ? "var(--destaque-suave)" : "var(--desenho-fundo, #fff)";
  const fillLado = c.destaque ? fill : "var(--desenho-sombra, #f1f1f1)";
  const frente = [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)];
  const topo = [P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)];
  const lado = [P(x + w, y, z), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x + w, y + h, z)];
  return (
    <g strokeLinejoin="round">
      <polygon points={poligono(lado)} fill={fillLado} />
      <polygon points={poligono(topo)} fill={fill} />
      <polygon points={poligono(frente)} fill={fill} />
    </g>
  );
}

type Cota = { letra: string; de: [number, number, number]; ate: [number, number, number]; off: [number, number] };

function CotaSvg({ c, ativa }: { c: Cota; ativa: boolean }) {
  const [x1, y1] = P(...c.de);
  const [x2, y2] = P(...c.ate);
  const [ox, oy] = c.off;
  const a = [x1 + ox, y1 + oy], b = [x2 + ox, y2 + oy];
  const mx = (a[0]! + b[0]!) / 2, my = (a[1]! + b[1]!) / 2;
  const cor = ativa ? "var(--destaque)" : "currentColor";
  return (
    <g stroke={cor} fill={cor} style={{ transition: "all .2s" }}>
      <line x1={x1} y1={y1} x2={a[0]} y2={a[1]} strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
      <line x1={x2} y1={y2} x2={b[0]} y2={b[1]} strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={ativa ? 2.5 : 1.5} markerStart="url(#seta)" markerEnd="url(#seta)" />
      <circle cx={mx} cy={my} r={ativa ? 13 : 11} stroke="none" />
      <text x={mx} y={my + 4.5} textAnchor="middle" fontSize={ativa ? 14 : 13} fontWeight={700} fill="var(--desenho-fundo, #fff)" stroke="none">{c.letra}</text>
    </g>
  );
}

// ---------- Composições ----------

const ALT_BASE = 18, ALT_ASSENTO = 44, ALT_COSTAS = 82, ALT_BRACO = 62, PROF = 90, BRACO = 20;

function sofa(lugares: number, opts: { x0?: number; semBracoDireito?: boolean; semBracoEsquerdo?: boolean } = {}): { caixas: Caixa[]; largura: number } {
  const x0 = opts.x0 ?? 0;
  const lug = 60;
  const largura = lugares * lug + 2 * BRACO;
  const cx: Caixa[] = [
    { x: x0 + BRACO, y: 0, z: 0, w: lugares * lug, h: ALT_BASE, d: PROF },
    { x: x0 + BRACO, y: ALT_BASE, z: PROF - 20, w: lugares * lug, h: ALT_COSTAS - ALT_BASE, d: 20 },
  ];
  for (let i = 0; i < lugares; i++) cx.push({ x: x0 + BRACO + i * lug, y: ALT_BASE, z: 0, w: lug, h: ALT_ASSENTO - ALT_BASE, d: PROF - 20 });
  if (!opts.semBracoEsquerdo) cx.push({ x: x0, y: 0, z: 0, w: BRACO, h: ALT_BRACO, d: PROF });
  if (!opts.semBracoDireito) cx.push({ x: x0 + largura - BRACO, y: 0, z: 0, w: BRACO, h: ALT_BRACO, d: PROF });
  return { caixas: cx, largura };
}

function chaise(lado: "esquerda" | "direita", braco: "curto" | "comprido" | null, destaque: boolean) {
  const lug = 60, n = 3, CH = 70; // CH = quanto a chaise avança para a frente
  const larg = n * lug + 2 * BRACO;
  const cx: Caixa[] = [];
  const xChaise = lado === "direita" ? BRACO + (n - 1) * lug : BRACO;
  // base + costas
  cx.push({ x: BRACO, y: 0, z: 0, w: n * lug, h: ALT_BASE, d: PROF });
  cx.push({ x: xChaise, y: 0, z: -CH, w: lug, h: ALT_BASE, d: CH });
  cx.push({ x: BRACO, y: ALT_BASE, z: PROF - 20, w: n * lug, h: ALT_COSTAS - ALT_BASE, d: 20 });
  // assentos normais
  for (let i = 0; i < n; i++) {
    const x = BRACO + i * lug;
    if (x === xChaise) continue;
    cx.push({ x, y: ALT_BASE, z: 0, w: lug, h: ALT_ASSENTO - ALT_BASE, d: PROF - 20 });
  }
  // assento da chaise (comprido)
  cx.push({ x: xChaise, y: ALT_BASE, z: -CH, w: lug, h: ALT_ASSENTO - ALT_BASE, d: CH + PROF - 20, destaque: destaque ? "suave" : undefined });
  // braços
  const bracoChaiseZ = braco === "curto" ? { z: 20, d: PROF - 20 } : { z: -CH, d: CH + PROF };
  const bracoOutroZ = { z: 0, d: PROF };
  const xEsq = 0, xDir = larg - BRACO;
  const bracoChaise: Caixa = { x: lado === "direita" ? xDir : xEsq, y: 0, w: BRACO, h: ALT_BRACO, ...bracoChaiseZ, destaque: braco && destaque ? "forte" : undefined };
  const bracoOutro: Caixa = { x: lado === "direita" ? xEsq : xDir, y: 0, w: BRACO, h: ALT_BRACO, ...bracoOutroZ };
  cx.push(bracoChaise, bracoOutro);
  return { caixas: cx, largura: larg, frente: -CH };
}

function canto() {
  const lug = 60, n = 3, ASA = 2; // asa = lado direito que vem para a frente
  const larg = n * lug + BRACO + PROF; // de fora a fora
  const cx: Caixa[] = [];
  // lado do fundo
  cx.push({ x: BRACO, y: 0, z: 0, w: n * lug + PROF, h: ALT_BASE, d: PROF });
  cx.push({ x: BRACO, y: ALT_BASE, z: PROF - 20, w: n * lug + PROF - 20, h: ALT_COSTAS - ALT_BASE, d: 20 });
  for (let i = 0; i < n; i++) cx.push({ x: BRACO + i * lug, y: ALT_BASE, z: 0, w: lug, h: ALT_ASSENTO - ALT_BASE, d: PROF - 20 });
  // asa direita (vem para a frente)
  const xA = BRACO + n * lug;
  const zA = -ASA * lug;
  cx.push({ x: xA, y: 0, z: zA, w: PROF, h: ALT_BASE, d: -zA });
  cx.push({ x: xA + PROF - 20, y: ALT_BASE, z: zA, w: 20, h: ALT_COSTAS - ALT_BASE, d: -zA + PROF });
  cx.push({ x: xA, y: ALT_BASE, z: 0, w: PROF - 20, h: ALT_ASSENTO - ALT_BASE, d: PROF - 20 });
  for (let i = 0; i < ASA; i++) cx.push({ x: xA, y: ALT_BASE, z: zA + i * lug, w: PROF - 20, h: ALT_ASSENTO - ALT_BASE, d: lug });
  // braços: esquerdo (fundo) e na ponta da asa
  cx.push({ x: 0, y: 0, z: 0, w: BRACO, h: ALT_BRACO, d: PROF });
  cx.push({ x: xA, y: 0, z: zA - BRACO, w: PROF, h: ALT_BRACO, d: BRACO });
  return { caixas: cx, largura: larg, frente: zA - BRACO };
}

function poltrona(relax: boolean) {
  const s = sofa(1);
  if (relax) {
    s.caixas.push({ x: BRACO + 4, y: 14, z: -48, w: 52, h: 10, d: 46 }); // apoio de pés aberto
  }
  return { ...s, frente: relax ? -48 : 0 };
}

function cadeira(encosto: boolean, destaque: boolean) {
  const L = 46, Pz = 44, AS = 46, PERNA = 4;
  const cx: Caixa[] = [];
  for (const [x, z] of [[0, 0], [L - PERNA, 0], [0, Pz - PERNA], [L - PERNA, Pz - PERNA]] as const)
    cx.push({ x, y: 0, z, w: PERNA, h: AS - 4, d: PERNA });
  cx.push({ x: -1, y: AS - 4, z: -1, w: L + 2, h: 6, d: Pz + 2, destaque: destaque ? "suave" : undefined });
  cx.push({ x: 0, y: AS + 2, z: Pz - 5, w: L, h: 44, d: 5, destaque: destaque && encosto ? "suave" : undefined });
  return { caixas: cx, largura: L, frente: 0 };
}

// ---------- API pública ----------

export type Desenho =
  | { tipo: "sofa"; lugares?: 2 | 3 | 4 }
  | { tipo: "chaise"; lado: "esquerda" | "direita"; braco: "curto" | "comprido" | null }
  | { tipo: "canto" }
  | { tipo: "poltrona" }
  | { tipo: "relax" }
  | { tipo: "cadeira"; encosto: boolean };

type Props = {
  desenho: Desenho;
  /** Destaca a chaise e o braço do lado da chaise (para escolher o tipo). */
  destaque?: boolean;
  /** Mostra as cotas A/B/C (no passo das medidas). */
  cotas?: boolean;
  /** Cota ativa (ex.: campo com foco). */
  ativa?: string | null;
  className?: string;
  titulo?: string;
};

function montar(d: Desenho, destaque: boolean) {
  switch (d.tipo) {
    case "sofa": return { ...sofa(d.lugares ?? 3), frente: 0 };
    case "chaise": return chaise(d.lado, d.braco, destaque);
    case "canto": return canto();
    case "poltrona": return poltrona(false);
    case "relax": return poltrona(true);
    case "cadeira": return cadeira(d.encosto, destaque);
  }
}

function cotasDe(d: Desenho, largura: number, frente: number): Cota[] {
  const baixo: [number, number] = [0, 26];
  switch (d.tipo) {
    case "chaise": {
      const xFora = d.lado === "direita" ? largura : 0;
      return [
        { letra: "A", de: [0, 0, frente], ate: [largura, 0, frente], off: [0, 28] },
        { letra: "B", de: [d.lado === "direita" ? 0 : largura, 0, 0], ate: [d.lado === "direita" ? 0 : largura, 0, PROF], off: d.lado === "direita" ? [-26, 0] : [26, 0] },
        { letra: "C", de: [xFora, 0, frente], ate: [xFora, 0, PROF], off: d.lado === "direita" ? [26, 0] : [-26, 0] },
      ];
    }
    case "canto":
      return [
        { letra: "A", de: [0, 0, 0], ate: [largura, 0, 0], off: [0, 0] },
        { letra: "B", de: [largura, 0, frente], ate: [largura, 0, PROF], off: [26, 0] },
        { letra: "C", de: [0, 0, 0], ate: [0, 0, PROF], off: [-26, 0] },
      ].map((c, i) => (i === 0 ? { ...c, de: [0, 0, 0] as [number, number, number], ate: [largura - PROF, 0, 0] as [number, number, number], off: baixo } : c));
    case "cadeira": {
      const base: Cota[] = [
        { letra: "A", de: [0, 0, 0], ate: [largura, 0, 0], off: [0, 22] },
        { letra: "B", de: [largura, 40, 0], ate: [largura, 40, 44], off: [16, 0] },
      ];
      return d.encosto ? [...base, { letra: "C", de: [0, 48, 44], ate: [0, 92, 44], off: [-16, 0] }] : base;
    }
    default:
      return [
        { letra: "A", de: [0, 0, frente], ate: [largura, 0, frente], off: baixo },
        { letra: "B", de: [largura, 0, frente], ate: [largura, 0, PROF], off: [24, 4] },
      ];
  }
}

export function Desenho3D({ desenho, destaque = false, cotas = false, ativa = null, className, titulo }: Props) {
  const { caixas, largura, frente } = montar(desenho, destaque);
  const listaCotas = cotas ? cotasDe(desenho, largura, frente) : [];

  // Caixa envolvente para o viewBox
  const pts: [number, number][] = [];
  for (const c of caixas)
    for (const dx of [0, c.w]) for (const dy of [0, c.h]) for (const dz of [0, c.d]) pts.push(P(c.x + dx, c.y + dy, c.z + dz));
  for (const c of listaCotas) {
    const a = P(...c.de), b = P(...c.ate);
    pts.push([a[0] + c.off[0], a[1] + c.off[1]], [b[0] + c.off[0], b[1] + c.off[1]]);
  }
  const m = cotas ? 22 : 8;
  const minX = Math.min(...pts.map((p) => p[0])) - m, maxX = Math.max(...pts.map((p) => p[0])) + m;
  const minY = Math.min(...pts.map((p) => p[1])) - m, maxY = Math.max(...pts.map((p) => p[1])) + m;

  const conteudo: ReactNode = ordenar(caixas).map((c, i) => <CaixaSvg key={i} c={c} />);
  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={className} role="img" aria-label={titulo}>
      {titulo && <title>{titulo}</title>}
      <defs>
        <marker id="seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9 z" fill="context-stroke" />
        </marker>
      </defs>
      <g stroke="currentColor" strokeWidth={1.6} fill="none">{conteudo}</g>
      {listaCotas.map((c) => <CotaSvg key={c.letra} c={c} ativa={ativa === c.letra} />)}
    </svg>
  );
}
