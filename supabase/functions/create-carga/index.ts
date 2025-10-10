// ============================================
// EDGE FUNCTION: create-carga
// Caminho: supabase/functions/create-carga/index.ts
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autenticação
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    const expectedToken = Deno.env.get("N8N_SHARED_TOKEN");

    if (!token || token !== expectedToken) {
      console.error("❌ Token inválido");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Receber payload
    const payload = await req.json();
    const data = payload;

    console.log("📥 Payload recebido:", JSON.stringify(data, null, 2));

    if (!data.numero_carga) {
      console.error("❌ numero_carga ausente");
      return new Response(JSON.stringify({ error: "numero_carga é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📦 Criando carga:", data.numero_carga);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Verificar se a carga já existe
    const { data: cargaExistente, error: checkError } = await supabase
      .from("cargas")
      .select("numero_carga")
      .eq("numero_carga", data.numero_carga)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Erro ao verificar carga:", checkError.message);
    }

    if (cargaExistente) {
      console.log("⚠️ Carga já existe, retornando sucesso");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Carga já existe",
          existing: true,
          data: cargaExistente,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mapeamento de status do n8n para o banco
    const statusMap: Record<string, string> = {
      "Aguardando Pré-Alerta": "No Armazém",
      "Aguardando Embarque": "Embarque Agendado",
      "Em Consolidação": "Em Consolidação",
      "Em Trânsito Internacional": "Em Trânsito",
      "Em Liberação": "Chegada no Brasil",
      Liberada: "Desembaraçado",
      "Em Expedição": "Desembaraçado",
      "Em Rota de Entrega": "Em Trânsito",
      Entregue: "Entregue",
    };

    const statusToUse = statusMap[data.status] || "No Armazém";

    console.log(`📊 Status: "${data.status}" → "${statusToUse}"`);

    // Preparar dados para inserção
    const insertData: Record<string, any> = {
      numero_carga: data.numero_carga,
      status: statusToUse,
      origem: data.origem || "Miami, FL",
      destino: data.destino || "Confins, MG",
      tipo_temperatura: data.temperatura_controlada ? "Controlada" : "Ambiente",
      transportadora: data.transportadora || "Não especificado",
      mawb: data.awb_number || null,
      hawb: data.hawb_number || null,
      // observacoes: comentado até confirmar que existe
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Adicionar previsão de embarque
    if (data.data_previsao_embarque) {
      insertData.data_embarque = data.data_previsao_embarque;
      console.log("📅 Previsão embarque:", data.data_previsao_embarque);
    }

    // Adicionar previsão de chegada
    if (data.data_previsao_chegada) {
      insertData.data_chegada_prevista = data.data_previsao_chegada;
      console.log("📅 Previsão chegada:", data.data_previsao_chegada);
    }

    // Adicionar data de autorização
    if (data.data_autorizacao) {
      insertData.data_autorizacao = data.data_autorizacao;
    }

    // Adicionar invoices nas observações (tabela não tem coluna invoices)
    if (data.invoices && Array.isArray(data.invoices) && data.invoices.length > 0) {
      const invoicesStr = "\nInvoices: " + data.invoices.join(", ");
      insertData.observacoes = (insertData.observacoes || "") + invoicesStr;
      console.log("📄 Invoices adicionadas:", data.invoices);
    }

    console.log("💾 Inserindo no banco:", JSON.stringify(insertData, null, 2));

    // Inserir no banco
    const { data: cargaCriada, error: insertError } = await supabase
      .from("cargas")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erro ao inserir:", insertError.message);
      console.error("❌ Detalhes:", insertError);
      throw insertError;
    }

    console.log("✅ Carga criada:", cargaCriada.numero_carga);

    return new Response(
      JSON.stringify({
        success: true,
        data: cargaCriada,
        message: `Carga ${data.numero_carga} criada com sucesso`,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Erro geral:", error.message);
    console.error("❌ Stack:", error.stack);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
