const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, pdf, filename } = await req.json();
    if ((!text || typeof text !== "string") && (!pdf || typeof pdf !== "string")) {
      return new Response(JSON.stringify({ error: "Envie um texto ou um PDF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = pdf
      ? [
          { type: "text", text: "Extraia o roteiro de leitura de lei seca deste documento." },
          {
            type: "file",
            file: {
              filename: typeof filename === "string" && filename ? filename : "roteiro.pdf",
              file_data: pdf.startsWith("data:") ? pdf : `data:application/pdf;base64,${pdf}`,
            },
          },
        ]
      : text.slice(0, 60000);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "Você extrai roteiros de leitura de lei seca. Retorne apenas os itens de leitura encontrados no texto, em ordem. Para cada item: 'law' (nome/sigla da lei, ex: CF/88, Lei 8.112/90), 'articles' (artigos a ler, ex: arts. 1º ao 5º), 'plannedMinutes' (minutos previstos; use 15 se não houver), 'day' (número sequencial do dia, começando em 1, se o texto organizar por dias; senão null).",
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_plan",
              description: "Envia o roteiro estruturado",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        law: { type: "string" },
                        articles: { type: "string" },
                        plannedMinutes: { type: "number" },
                        day: { type: ["number", "null"] },
                      },
                      required: ["law", "articles", "plannedMinutes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_plan" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente mais tarde." }), {
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
    if (!response.ok) {
      const detail = await response.text();
      console.error("AI gateway error", response.status, detail);
      return new Response(JSON.stringify({ error: "Falha ao interpretar o roteiro." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = call ? JSON.parse(call.function.arguments) : { items: [] };

    return new Response(JSON.stringify({ items: parsed.items ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
