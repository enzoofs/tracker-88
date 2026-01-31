const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { indicators, summary } = await req.json();

    if (!indicators || !Array.isArray(indicators)) {
      return new Response(
        JSON.stringify({ error: 'indicators array é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build aggregated data for the prompt (no raw customer data)
    const indicatorsSummary = indicators.map((ind: any) => ({
      nome: ind.name,
      valor: ind.value,
      formula: ind.formula,
      amostra: ind.sampleSize,
      totalElegivel: ind.totalEligible,
      cobertura: `${ind.coveragePercent}%`,
      dadosFaltantes: ind.missingDataRecords?.length || 0
    }));

    const prompt = `Você é um analista de logística de importação de produtos biotecnológicos. Analise os indicadores operacionais abaixo e gere um relatório em português brasileiro.

## Contexto
- Empresa de importação que consolida pedidos (Sales Orders) em cargas
- SLA de entrega: 15 dias úteis a partir do envio FedEx (data_envio)
- Datas críticas: data_envio (saída FedEx) → data_entrega (entrega final ao cliente)

## Indicadores

${JSON.stringify(indicatorsSummary, null, 2)}

## Resumo Geral
- Total de pedidos: ${summary.totalSOs}
- Total entregues: ${summary.totalDelivered}
- Com data de envio: ${summary.withDataEnvio}
- Com data de entrega: ${summary.withDataEntrega}
- Com ambas as datas: ${summary.withBothDates} (${summary.coveragePercent}% de cobertura)

## Instruções
Gere um relatório estruturado em markdown com:

1. **Resumo Executivo** (3-4 frases objetivas sobre a situação geral)
2. **Análise por Indicador** (para cada indicador: interpretação do valor, qualidade da amostra, possíveis vieses)
3. **Contradições e Inconsistências** (compare indicadores entre si — ex: se a taxa de entrega no prazo é alta mas há muitos pedidos atrasados, isso é uma contradição que DEVE ser reportada. Se a amostra de um indicador é muito menor que o total, o valor não é representativo.)
4. **Alertas de Qualidade de Dados** (campos faltantes, cobertura insuficiente, dados que podem distorcer métricas)
5. **Recomendações** (máximo 5, práticas e priorizadas)

REGRAS CRÍTICAS:
- Se a amostra (campo "amostra") for menor que 50% do total elegível, marque o indicador como **NÃO CONFIÁVEL** em negrito.
- Se dois indicadores se contradizem (ex: alta taxa on-time + muitos atrasados), SEMPRE reporte isso como alerta vermelho.
- Nunca ignore inconsistências nos dados. Questione os números em vez de aceitá-los.
- Seja direto, técnico e objetivo. Não invente dados.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um analista de logística especializado em operações de importação. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI error:', errorBody);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar relatório com OpenAI' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const report = result.choices?.[0]?.message?.content || 'Não foi possível gerar o relatório.';

    return new Response(
      JSON.stringify({
        report,
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
        usage: result.usage
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
