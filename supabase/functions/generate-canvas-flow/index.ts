import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(complexity: string, layout: string, style: string) {
  const nodeCount = complexity === 'basic' ? '5-10' : complexity === 'complete' ? '15-25' : '10-18';
  const direction = layout === 'horizontal' ? 'horizontal (esquerda→direita)' : 'vertical (cima→baixo)';

  const styleGuide = style === 'corporate'
    ? 'Use tons mais sóbrios e profissionais: azul escuro (#1e40af), cinza (#374151), verde escuro (#166534), bordô (#991b1b). Cores sutis e elegantes.'
    : style === 'colorful'
    ? 'Use cores vibrantes e variadas: verde-limão (#84cc16), roxo (#a855f7), rosa (#ec4899), laranja (#f97316), ciano (#06b6d4), amarelo (#eab308). Paleta alegre e diversa.'
    : 'Use cores modernas e equilibradas conforme os nodeTypes padrão definidos abaixo.';

  return `Você é um arquiteto sênior de processos e diagramas de fluxo.
O usuário vai descrever um processo/fluxo em texto livre e você deve gerar um diagrama profissional, completo e documentado no formato de nós e conexões para React Flow.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o JSON usando a tool "generate_flow", sem texto adicional.
2. Cada nó deve ter: id (string), type ("default"), position ({x, y}), data ({label, description, nodeType, icon, color}).
3. nodeType pode ser: "start" (início), "end" (fim), "process" (processo/ação), "decision" (decisão/condição), "wait" (espera/pendência), "document" (documento/registro), "database" (banco de dados/sistema), "notification" (notificação/alerta), "integration" (integração externa), "approval" (aprovação/validação), "error" (erro/exceção).
4. icon deve ser um nome de ícone Lucide válido e semântico para a etapa. Exemplos: "Play", "CheckCircle", "GitBranch", "Clock", "FileText", "Database", "Bell", "Settings", "Users", "Package", "Wrench", "Trash2", "AlertTriangle", "ArrowRight", "Shield", "Mail", "Server", "MonitorCheck", "UserCheck", "ClipboardList", "Hammer", "Eye", "Lock", "RefreshCcw", "Zap", "Flag", "Target", "ThumbsUp", "ThumbsDown", "Send", "BarChart3".
5. Cores padrão por nodeType (${style === 'modern' ? 'usar estas' : 'adaptar ao estilo solicitado'}):
   - start: "#22c55e"
   - end: "#ef4444"
   - process: "#3b82f6"
   - decision: "#f59e0b"
   - wait: "#8b5cf6"
   - document: "#6b7280"
   - database: "#06b6d4"
   - notification: "#ec4899"
   - integration: "#14b8a6"
   - approval: "#10b981"
   - error: "#dc2626"
   ${styleGuide}
6. Conexões (edges): id, source, target, label (opcional), type ("smoothstep"), animated (boolean — true para fluxos principais), style ({stroke: cor hex}).
7. Layout ${direction}: distribua os nós com ~150px entre linhas e ~300px entre colunas. Use ramificações para decisões (caminhos "Sim"/"Não" lado a lado).
8. Gere entre ${nodeCount} nós dependendo da complexidade descrita.
9. Cada nó DEVE ter uma description de 1-2 frases explicando o que acontece, quem é responsável e quais sistemas/ferramentas são usados.
10. Conexões de decisão devem SEMPRE ter labels descritivos: "Sim", "Não", "Aprovado", "Rejeitado", "Excede limite", "Dentro do SLA", etc.
11. O primeiro nó deve ser nodeType "start" e o(s) último(s) "end".
12. Inclua tratamento de exceções: pelo menos um caminho de erro ou rejeição quando aplicável.
13. Considere loops de feedback quando o processo descrever retornos ou retrabalhos.
14. Para integrações com sistemas externos, use nodeType "integration" ou "database".
15. Sempre use IDs semânticos e sequenciais: "node-1", "node-2", etc. e "edge-1", "edge-2", etc.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description, complexity = 'detailed', layout = 'vertical', style = 'modern' } = await req.json();
    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "Descrição é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(complexity, layout, style);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_flow",
              description: "Gera um fluxo de canvas com nós e conexões.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome sugerido para o canvas" },
                  nodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string" },
                        position: {
                          type: "object",
                          properties: { x: { type: "number" }, y: { type: "number" } },
                          required: ["x", "y"],
                        },
                        data: {
                          type: "object",
                          properties: {
                            label: { type: "string" },
                            description: { type: "string" },
                            nodeType: { type: "string" },
                            icon: { type: "string" },
                            color: { type: "string" },
                          },
                          required: ["label", "description", "nodeType", "icon", "color"],
                        },
                      },
                      required: ["id", "type", "position", "data"],
                    },
                  },
                  edges: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        source: { type: "string" },
                        target: { type: "string" },
                        label: { type: "string" },
                        type: { type: "string" },
                        animated: { type: "boolean" },
                        style: {
                          type: "object",
                          properties: { stroke: { type: "string" } },
                        },
                      },
                      required: ["id", "source", "target"],
                    },
                  },
                },
                required: ["name", "nodes", "edges"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_flow" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "A IA não retornou um fluxo válido." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flowData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(flowData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-canvas-flow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
