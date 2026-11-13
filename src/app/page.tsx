"use client";

import { useState } from "react";
import { DiagramaMedidas, IconeTipo, PlantaChaise } from "@/components/Ilustracoes";
import { PREFERENCIAS, TIPOS_SOFA, type PedidoSugestao, type RespostaSugestao } from "@/lib/esquemas";

type Tipo = keyof typeof TIPOS_SOFA;
type Preferencia = keyof typeof PREFERENCIAS;
type Lado = "esquerdo" | "direito" | "nao_sei";
type Braco = "curto" | "comprido" | "nao_sei";
type Foto = PedidoSugestao["fotos"][number] & { previa: string };

const COM_LUGARES: Tipo[] = ["sofa", "sofa_sem_bracos", "relax", "clic_clac"];
const COM_CHAISE: Tipo[] = ["chaise_longue", "canto"];
const SEM_BRACOS: Tipo[] = ["sofa_sem_bracos", "clic_clac", "puff"];
const LIMITE_BRACO_CURTO_CM = 100; // curto ≈ 60–90 cm, comprido ≈ 110–160 cm

const ADEQUACAO = {
  ideal: { texto: "Ideal", classe: "bg-emerald-100 text-emerald-800" },
  boa: { texto: "Boa opção", classe: "bg-sky-100 text-sky-800" },
  possivel: { texto: "Possível", classe: "bg-amber-100 text-amber-800" },
};

const numero = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Reduz a foto no browser (máx. 1280 px, JPEG) antes de enviar.
async function prepararFoto(ficheiro: File): Promise<Foto> {
  const bitmap = await createImageBitmap(ficheiro);
  const escala = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.8);
  return { tipo: "image/jpeg", dados: url.split(",")[1], previa: url };
}

function Opcao(props: { ativo: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={props.ativo}
      onClick={props.onClick}
      className={`rounded-xl border-2 p-3 text-sm transition ${
        props.ativo ? "border-accent bg-accent-soft font-medium" : "border-border bg-card hover:border-accent/50"
      } ${props.className ?? ""}`}
    >
      {props.children}
    </button>
  );
}

function CampoCm(props: { id: string; rotulo: string; ajuda: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={props.id} className="flex flex-col gap-1">
      <span className="text-sm font-medium">{props.rotulo}</span>
      <div className="flex items-center rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-accent/40">
        <input
          id={props.id}
          inputMode="decimal"
          value={props.valor}
          onChange={(e) => props.onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2 outline-none"
          placeholder="—"
        />
        <span className="pr-3 text-sm text-muted">cm</span>
      </div>
      <span className="text-xs text-muted">{props.ajuda}</span>
    </label>
  );
}

export default function Pagina() {
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [lugares, setLugares] = useState("");
  const [lado, setLado] = useState<Lado | null>(null);
  const [braco, setBraco] = useState<Braco | null>(null);
  const [m, setM] = useState({ largura: "", profundidade: "", altura: "", braco: "", chaise: "", larguraChaise: "", bracoChaise: "" });
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [preferencias, setPreferencias] = useState<Preferencia[]>([]);
  const [observacoes, setObservacoes] = useState("");
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaSugestao | null>(null);

  const temChaise = tipo != null && COM_CHAISE.includes(tipo);
  const passos = ["Tipo de sofá", ...(temChaise ? ["Identificar a chaise"] : []), "Medidas e fotos", "Preferências"];
  const nomePasso = passos[passo];
  const ultimo = passo === passos.length - 1;
  const setMedida = (k: keyof typeof m) => (v: string) => setM((a) => ({ ...a, [k]: v }));

  // Se o cliente mediu o braço do lado da chaise, deduzimos curto/comprido.
  const bracoMedido = numero(m.bracoChaise);
  const bracoDeduzido: Braco | null = bracoMedido == null ? null : bracoMedido < LIMITE_BRACO_CURTO_CM ? "curto" : "comprido";

  function podeAvancar(): string | null {
    if (nomePasso === "Tipo de sofá" && !tipo) return "Escolha o tipo de sofá.";
    if (nomePasso === "Identificar a chaise" && (!lado || !braco)) return "Escolha uma opção em cada pergunta (pode escolher “Não sei”).";
    if (nomePasso === "Medidas e fotos" && !numero(m.largura) && fotos.length === 0) return "Indique pelo menos a largura total (A) ou envie uma foto do sofá.";
    if (nomePasso === "Medidas e fotos" && (lado === "nao_sei" || braco === "nao_sei") && fotos.length === 0 && !bracoDeduzido)
      return "Como não sabe o lado ou o braço da chaise, envie uma foto do sofá tirada de frente.";
    return null;
  }

  function seguinte() {
    const problema = podeAvancar();
    setErro(problema);
    if (problema) return;
    if (ultimo) void submeter();
    else setPasso(passo + 1);
  }

  async function adicionarFotos(ficheiros: FileList | null) {
    if (!ficheiros) return;
    const novas = await Promise.all([...ficheiros].slice(0, 3 - fotos.length).map(prepararFoto));
    setFotos((f) => [...f, ...novas].slice(0, 3));
  }

  async function submeter() {
    if (!tipo) return;
    const pedido: PedidoSugestao = {
      tipo,
      lugares: COM_LUGARES.includes(tipo) && lugares ? parseInt(lugares, 10) : null,
      ladoChaise: temChaise ? lado : null,
      bracoChaise: temChaise ? (braco === "nao_sei" && bracoDeduzido ? bracoDeduzido : braco) : null,
      larguraCm: numero(m.largura),
      profundidadeCm: numero(m.profundidade),
      alturaEncostoCm: numero(m.altura),
      larguraBracoCm: SEM_BRACOS.includes(tipo) ? null : numero(m.braco),
      comprimentoChaiseCm: temChaise ? numero(m.chaise) : null,
      larguraChaiseCm: temChaise ? numero(m.larguraChaise) : null,
      comprimentoBracoChaiseCm: temChaise ? bracoMedido : null,
      fotos: fotos.map(({ tipo, dados }) => ({ tipo, dados })),
      preferencias,
      observacoes,
    };
    setACarregar(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch("/api/sugerir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
      const dados = await r.json().catch(() => ({ erro: "Erro inesperado." }));
      if (!r.ok) throw new Error(dados.erro ?? "Erro inesperado.");
      setResultado(dados);
      requestAnimationFrame(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setACarregar(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Plurata · Assistente de medidas</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Que capa serve no meu sofá?</h1>
        <p className="mt-3 text-muted">Responda a algumas perguntas e indicamos as capas que servem e o tamanho a escolher.</p>
      </header>

      <ol className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {passos.map((nome, i) => (
          <li key={nome} className={i === passo ? "font-semibold text-accent" : i < passo ? "text-foreground" : "text-muted"}>
            {i + 1}. {nome}
          </li>
        ))}
      </ol>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
        {nomePasso === "Tipo de sofá" && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Que tipo de sofá tem?</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.entries(TIPOS_SOFA) as [Tipo, string][]).map(([k, rotulo]) => (
                <Opcao
                  key={k}
                  ativo={tipo === k}
                  onClick={() => {
                    setTipo(k);
                    setErro(null);
                  }}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <IconeTipo tipo={k} />
                  {rotulo}
                </Opcao>
              ))}
            </div>
            {tipo && COM_LUGARES.includes(tipo) && (
              <label className="mt-5 flex max-w-xs flex-col gap-1">
                <span className="text-sm font-medium">Número de lugares</span>
                <select value={lugares} onChange={(e) => setLugares(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2">
                  <option value="">Não sei</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "lugar" : "lugares"}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {nomePasso === "Identificar a chaise" && (
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-lg font-semibold">De que lado fica a chaise longue?</h2>
              <p className="mt-1 text-sm text-muted">
                Ponha-se de pé <strong>de frente para o sofá</strong>, como se se fosse sentar. A chaise fica à sua esquerda ou à sua direita?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(["esquerdo", "direito"] as const).map((l) => (
                  <Opcao key={l} ativo={lado === l} onClick={() => setLado(l)} className="flex flex-col items-center gap-1">
                    <PlantaChaise lado={l} />
                    Chaise à {l === "esquerdo" ? "esquerda" : "direita"}
                  </Opcao>
                ))}
                <Opcao ativo={lado === "nao_sei"} onClick={() => setLado("nao_sei")} className="col-span-2 sm:col-span-1">
                  Não sei — vou enviar uma foto
                </Opcao>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Como é o braço do lado da chaise?</h2>
              <p className="mt-1 text-sm text-muted">
                Olhe para o braço que fica do lado da chaise longue. Vai até à ponta da chaise, ou fica só junto às costas?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(["curto", "comprido"] as const).map((b) => (
                  <Opcao key={b} ativo={braco === b} onClick={() => setBraco(b)} className="flex flex-col items-center gap-1 text-center">
                    <PlantaChaise lado={lado === "esquerdo" ? "esquerdo" : "direito"} braco={b} />
                    <span>Braço {b}</span>
                    <span className="text-xs font-normal text-muted">
                      {b === "curto" ? "Só junto às costas (≈ 60–90 cm)" : "Ao longo de toda a chaise (≈ 110–160 cm)"}
                    </span>
                  </Opcao>
                ))}
                <Opcao ativo={braco === "nao_sei"} onClick={() => setBraco("nao_sei")} className="col-span-2 sm:col-span-1">
                  Não sei — vou medir ou enviar foto
                </Opcao>
              </div>
            </div>
          </div>
        )}

        {nomePasso === "Medidas e fotos" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold">Meça o sofá</h2>
              <p className="mt-1 text-sm text-muted">Use uma fita métrica. Só a largura total (A) é essencial; as outras medidas ajudam a acertar.</p>
            </div>
            <div className="flex justify-center rounded-xl bg-background p-4">
              <DiagramaMedidas chaise={temChaise} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoCm id="largura" rotulo="A · Largura total" ajuda="De um braço ao outro, por fora, ao longo das costas." valor={m.largura} onChange={setMedida("largura")} />
              <CampoCm id="profundidade" rotulo="C · Profundidade" ajuda="Da frente do assento até trás das costas." valor={m.profundidade} onChange={setMedida("profundidade")} />
              <CampoCm id="altura" rotulo="Altura do encosto" ajuda="Do chão ao topo das costas." valor={m.altura} onChange={setMedida("altura")} />
              {tipo && !SEM_BRACOS.includes(tipo) && !temChaise && (
                <CampoCm id="braco" rotulo="D · Largura do braço" ajuda="Largura de um braço, visto de cima." valor={m.braco} onChange={setMedida("braco")} />
              )}
              {temChaise && (
                <>
                  <CampoCm id="chaise" rotulo="B · Comprimento da chaise" ajuda="Das costas do sofá até à ponta da chaise." valor={m.chaise} onChange={setMedida("chaise")} />
                  <CampoCm id="larguraChaise" rotulo="E · Largura da chaise" ajuda="Largura só da parte da chaise." valor={m.larguraChaise} onChange={setMedida("larguraChaise")} />
                  <CampoCm
                    id="bracoChaise"
                    rotulo="F · Comprimento do braço da chaise"
                    ajuda={
                      bracoDeduzido
                        ? `Com esta medida, o braço é ${bracoDeduzido}.`
                        : "Comprimento do braço do lado da chaise. Ajuda a saber se é curto ou comprido."
                    }
                    valor={m.bracoChaise}
                    onChange={setMedida("bracoChaise")}
                  />
                </>
              )}
            </div>

            <div>
              <h3 className="font-semibold">Fotos do sofá <span className="font-normal text-muted">(opcional, até 3)</span></h3>
              <p className="mt-1 text-sm text-muted">
                Tire a foto <strong>de frente</strong>, com o sofá inteiro. Ajuda a identificar o tipo, o lado da chaise e os braços.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {fotos.map((f, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.previa} alt={`Foto ${i + 1}`} className="h-24 w-32 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-foreground text-xs text-white"
                      aria-label="Remover foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {fotos.length < 3 && (
                  <label className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-sm text-muted hover:border-accent/50">
                    <span className="text-2xl">＋</span>
                    Adicionar
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => adicionarFotos(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {nomePasso === "Preferências" && (
          <div>
            <h2 className="mb-1 text-lg font-semibold">Alguma preferência?</h2>
            <p className="mb-4 text-sm text-muted">Opcional. Ajuda a escolher entre capas que servem.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PREFERENCIAS) as [Preferencia, string][]).map(([k, rotulo]) => {
                const ativo = preferencias.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={ativo}
                    onClick={() => setPreferencias(ativo ? preferencias.filter((p) => p !== k) : [...preferencias, k])}
                    className={`rounded-full border px-3 py-1.5 text-sm ${ativo ? "border-accent bg-accent text-white" : "border-border hover:border-accent/50"}`}
                  >
                    {rotulo}
                  </button>
                );
              })}
            </div>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value.slice(0, 500))}
              placeholder="Algo mais sobre o seu sofá? (ex.: almofadas soltas, braços muito altos, pés em madeira)"
              rows={3}
              className="mt-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        )}

        {erro && <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{erro}</p>}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setPasso(Math.max(0, passo - 1));
            }}
            className={`rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-foreground ${passo === 0 ? "invisible" : ""}`}
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={seguinte}
            disabled={aCarregar}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {ultimo ? (aCarregar ? "A procurar a capa certa…" : "Ver capas aconselhadas") : "Seguinte →"}
          </button>
        </div>
      </section>

      {resultado && (
        <section id="resultados" className="mt-10">
          <h2 className="text-2xl font-semibold">As nossas sugestões</h2>
          <p className="mt-2 text-muted">{resultado.resumo}</p>

          {resultado.identificacao && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent-soft p-4 sm:flex-row sm:items-center">
              {resultado.identificacao.ladoChaise && (
                <div className="w-40 shrink-0">
                  <PlantaChaise lado={resultado.identificacao.ladoChaise} braco={resultado.identificacao.bracoChaise ?? undefined} />
                </div>
              )}
              <div className="text-sm">
                <p className="font-semibold">O que identificámos — confirme, por favor</p>
                <p className="mt-1">
                  {resultado.identificacao.ladoChaise && <>Chaise à <strong>{resultado.identificacao.ladoChaise === "esquerdo" ? "esquerda" : "direita"}</strong>. </>}
                  {resultado.identificacao.bracoChaise && <>Braço <strong>{resultado.identificacao.bracoChaise}</strong>. </>}
                  {resultado.identificacao.nota}
                </p>
              </div>
            </div>
          )}

          {resultado.avisos.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {resultado.avisos.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid gap-4">
            {resultado.recomendacoes.map((r) => (
              <article key={r.handle} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row">
                {r.imagem && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imagem} alt={r.titulo} className="h-40 w-full rounded-xl object-cover sm:h-32 sm:w-32" />
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ADEQUACAO[r.adequacao].classe}`}>{ADEQUACAO[r.adequacao].texto}</span>
                    {r.variante.map((v) => (
                      <span key={v} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                        {v}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-lg font-semibold leading-snug">{r.titulo}</h3>
                  <p className="text-sm text-muted">{r.motivo}</p>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                    {r.preco != null && <span className="font-semibold">€{r.preco.toFixed(2).replace(".", ",")}</span>}
                    <a href={r.url} target="_blank" rel="noopener" className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent hover:text-white">
                      Ver na loja →
                    </a>
                  </div>
                </div>
              </article>
            ))}
            {resultado.recomendacoes.length === 0 && (
              <p className="rounded-lg border border-border bg-card p-4 text-sm">
                Não encontrámos uma capa que sirva com estes dados. Fale connosco e ajudamos a encontrar uma solução.
              </p>
            )}
          </div>
          <p className="mt-6 text-xs text-muted">
            Sugestões geradas automaticamente com base nas tabelas de medidas dos produtos. Confirme sempre o guia de tamanhos na página do produto.
          </p>
        </section>
      )}
    </main>
  );
}
