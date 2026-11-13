import Anthropic from "@anthropic-ai/sdk";
import { PedidoSugestao, temMedidasOuFotos } from "@/lib/esquemas";
import { sugerirCapas } from "@/lib/sugerir";

export const maxDuration = 120; // pedidos com fotos podem demorar mais

// Limite simples por IP (memória do processo) para evitar abuso da API paga.
// Num alojamento com várias instâncias, trocar por um limite partilhado (ex.: Upstash/KV).
const JANELA_MS = 10 * 60 * 1000;
const MAX_PEDIDOS = 10;
const pedidosPorIp = new Map<string, number[]>();

function limiteExcedido(ip: string): boolean {
  const agora = Date.now();
  const recentes = (pedidosPorIp.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  pedidosPorIp.set(ip, recentes);
  return recentes.length > MAX_PEDIDOS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limiteExcedido(ip)) {
    return Response.json({ erro: "Demasiados pedidos. Tente novamente daqui a alguns minutos." }, { status: 429 });
  }

  const corpo = await request.json().catch(() => null);
  const pedido = PedidoSugestao.safeParse(corpo);
  if (!pedido.success) {
    return Response.json({ erro: "Dados inválidos. Verifique as medidas." }, { status: 400 });
  }
  if (!temMedidasOuFotos(pedido.data)) {
    return Response.json({ erro: "Indique a largura do sofá ou envie uma foto." }, { status: 400 });
  }

  try {
    return Response.json(await sugerirCapas(pedido.data));
  } catch (erro) {
    if (erro instanceof Anthropic.RateLimitError) {
      return Response.json({ erro: "O serviço está ocupado. Tente novamente dentro de instantes." }, { status: 503 });
    }
    if (erro instanceof Anthropic.APIError) {
      console.error("Erro da API Claude:", erro.status, erro.message);
    } else {
      console.error(erro);
    }
    return Response.json({ erro: "Não foi possível obter sugestões. Tente novamente." }, { status: 500 });
  }
}
