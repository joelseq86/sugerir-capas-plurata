// Desenhos simples (SVG) para ajudar o cliente a identificar o sofá.
// Vistas de cima (planta), com o cliente desenhado à frente do sofá, para o lado ficar óbvio.

const traco = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinejoin: "round" as const };
const preenchido = { fill: "var(--accent-soft)", stroke: "currentColor", strokeWidth: 2.5, strokeLinejoin: "round" as const };

function Pessoa({ x, y }: { x: number; y: number }) {
  return (
    <g fill="var(--accent)">
      <circle cx={x} cy={y} r="6" />
      <path d={`M${x - 10} ${y + 20} q10 -14 20 0 z`} />
    </g>
  );
}

// Ícones do passo "tipo de sofá" (vista de frente, simplificados).
export function IconeTipo({ tipo }: { tipo: string }) {
  const comum = { viewBox: "0 0 120 70", className: "h-12 w-auto" };
  switch (tipo) {
    case "poltrona":
      return (
        <svg {...comum}><g {...traco}><rect x="40" y="12" width="40" height="34" rx="6" /><rect x="30" y="28" width="12" height="28" rx="4" /><rect x="78" y="28" width="12" height="28" rx="4" /><rect x="42" y="40" width="36" height="16" rx="3" /></g></svg>
      );
    case "puff":
      return <svg {...comum}><g {...traco}><rect x="38" y="28" width="44" height="28" rx="8" /></g></svg>;
    case "sofa_sem_bracos":
    case "clic_clac":
      return (
        <svg {...comum}><g {...traco}><rect x="14" y="14" width="92" height="28" rx="5" /><rect x="14" y="38" width="92" height="18" rx="4" />{tipo === "clic_clac" && <line x1="60" y1="14" x2="60" y2="56" strokeDasharray="4 4" />}</g></svg>
      );
    case "relax":
      return (
        <svg {...comum}><g {...traco}><rect x="18" y="10" width="84" height="32" rx="6" /><rect x="8" y="28" width="12" height="28" rx="4" /><rect x="100" y="28" width="12" height="28" rx="4" /><rect x="20" y="40" width="80" height="16" rx="3" /><path d="M32 56 l-6 10 M60 56 l0 10 M88 56 l6 10" /></g></svg>
      );
    case "chaise_longue":
    case "canto":
      return (
        <svg {...comum}><g {...traco}><path d="M12 14 h96 v52 h-26 v-24 h-64 z" /><rect x="8" y="30" width="10" height="24" rx="3" />{tipo === "canto" && <path d="M108 14 v52" />}</g></svg>
      );
    default:
      return (
        <svg {...comum}><g {...traco}><rect x="18" y="12" width="84" height="30" rx="6" /><rect x="8" y="28" width="12" height="28" rx="4" /><rect x="100" y="28" width="12" height="28" rx="4" /><rect x="20" y="40" width="80" height="16" rx="3" /></g></svg>
      );
  }
}

// Planta do sofá com chaise longue. lado = lado da chaise, visto de frente; braco = braço do lado da chaise.
export function PlantaChaise({ lado, braco }: { lado: "esquerdo" | "direito"; braco?: "curto" | "comprido" }) {
  // Desenha com a chaise à direita e espelha para a esquerda.
  const espelho = lado === "esquerdo" ? "translate(200 0) scale(-1 1)" : undefined;
  return (
    <svg viewBox="0 0 200 170" className="h-auto w-full" aria-hidden>
      <g transform={espelho} className="text-foreground/80">
        {/* costas */}
        <rect x="20" y="14" width="160" height="16" rx="4" {...traco} />
        {/* braço do lado oposto */}
        <rect x="20" y="30" width="16" height="56" rx="4" {...traco} />
        {/* assentos */}
        <rect x="36" y="30" width="88" height="56" rx="3" {...traco} />
        {/* chaise */}
        <rect x="124" y="30" width="40" height="110" rx="3" {...preenchido} />
        {/* braço do lado da chaise */}
        {braco === "comprido" && <rect x="164" y="30" width="16" height="110" rx="4" {...traco} />}
        {braco === "curto" && <rect x="164" y="30" width="16" height="44" rx="4" {...traco} />}
        {!braco && <rect x="164" y="30" width="16" height="110" rx="4" {...traco} strokeDasharray="5 5" />}
      </g>
      <Pessoa x={100} y={140} />
    </svg>
  );
}

// Diagrama de medição conforme o tipo de sofá (vista de cima, com letras).
export function DiagramaMedidas({ chaise }: { chaise: boolean }) {
  const cota = { stroke: "var(--accent)", strokeWidth: 1.5, fill: "var(--accent)", fontSize: 13, fontFamily: "inherit" };
  if (chaise) {
    return (
      <svg viewBox="0 0 300 220" className="w-full max-w-sm" role="img" aria-label="Como medir o sofá com chaise longue">
        <g className="text-foreground/80">
          <rect x="40" y="40" width="200" height="16" rx="4" {...traco} />
          <rect x="40" y="56" width="16" height="64" rx="4" {...traco} />
          <rect x="56" y="56" width="118" height="64" rx="3" {...traco} />
          <rect x="174" y="56" width="50" height="120" rx="3" {...preenchido} />
          <rect x="224" y="56" width="16" height="120" rx="4" {...traco} />
        </g>
        <g {...cota}>
          {/* A: largura total */}
          <line x1="40" y1="24" x2="240" y2="24" />
          <text x="140" y="17" textAnchor="middle" stroke="none">A · largura total</text>
          {/* C: profundidade */}
          <line x1="24" y1="40" x2="24" y2="120" />
          <text x="20" y="86" textAnchor="end" stroke="none">C</text>
          {/* B: comprimento da chaise (das costas à ponta) */}
          <line x1="272" y1="40" x2="272" y2="176" />
          <text x="282" y="112" stroke="none">B</text>
          {/* F: braço do lado da chaise */}
          <line x1="252" y1="56" x2="252" y2="176" strokeDasharray="3 3" />
          <text x="256" y="190" stroke="none">F</text>
          {/* E: largura da chaise */}
          <line x1="174" y1="192" x2="224" y2="192" />
          <text x="199" y="210" textAnchor="middle" stroke="none">E</text>
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 260 150" className="w-full max-w-sm" role="img" aria-label="Como medir o sofá">
      <g className="text-foreground/80">
        <rect x="30" y="40" width="200" height="16" rx="4" {...traco} />
        <rect x="30" y="56" width="20" height="64" rx="4" {...traco} />
        <rect x="210" y="56" width="20" height="64" rx="4" {...traco} />
        <rect x="50" y="56" width="160" height="64" rx="3" {...traco} />
      </g>
      <g {...cota}>
        <line x1="30" y1="24" x2="230" y2="24" />
        <text x="130" y="18" textAnchor="middle" stroke="none">A · largura total</text>
        <line x1="14" y1="40" x2="14" y2="120" />
        <text x="10" y="138" stroke="none">C · prof.</text>
        <line x1="210" y1="134" x2="230" y2="134" />
        <text x="232" y="148" textAnchor="end" stroke="none">D · braço</text>
      </g>
    </svg>
  );
}
