// ============================================
// 1. EDGE FUNCTION: create-carga
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
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    const expectedToken = Deno.env.get("N8N_SHARED_TOKEN");

    if (!token || token !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const data = payload;

    if (!data.numero_carga) {
      return new Response(JSON.stringify({ error: "numero_carga é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📦 Criando nova carga:", data.numero_carga);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Verificar se a carga já existe
    const { data: cargaExistente } = await supabase
      .from("cargas")
      .select("numero_carga")
      .eq("numero_carga", data.numero_carga)
      .single();

    if (cargaExistente) {
      console.log("⚠️ Carga já existe, retornando sucesso");
      return new Response(JSON.stringify({ success: true, message: "Carga já existe", existing: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Status válidos mapeados
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

    // Preparar dados para inserção
    const insertData: Record<string, any> = {
      numero_carga: data.numero_carga,
      status: statusToUse,
      origem: data.origem || "Miami, FL",
      destino: data.destino || "Confins, MG",
      tipo_temperatura: data.temperatura_controlada ? "Controlada" : "Ambiente",
      transportadora: data.transportadora || "Não especificado",
      mawb: data.awb_number,
      hawb: data.hawb_number,
      observacoes: data.observacoes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Adicionar datas de previsão SE fornecidas (nomes corretos do banco)
    if (data.data_previsao_embarque) {
      insertData.data_embarque = data.data_previsao_embarque;
    }
    if (data.data_previsao_chegada) {
      insertData.data_chegada_prevista = data.data_previsao_chegada;
    }

    // Adicionar data de autorização se for autorização
    if (data.data_autorizacao) {
      insertData.data_autorizacao = data.data_autorizacao;
    }

    // Adicionar invoices se fornecidas (não existe coluna invoices na tabela atual)
    // Se você quiser salvar invoices, adicione nas observações
    if (data.invoices && Array.isArray(data.invoices) && data.invoices.length > 0) {
      const invoicesStr = "\nInvoices: " + data.invoices.join(", ");
      insertData.observacoes = (insertData.observacoes || "") + invoicesStr;
    }

    console.log("📝 Dados a inserir:", insertData);

    const { data: cargaCriada, error: insertError } = await supabase
      .from("cargas")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Erro ao criar carga:", insertError.message);
      throw insertError;
    }

    console.log("✅ Carga criada com sucesso:", cargaCriada.numero_carga);

    return new Response(JSON.stringify({ success: true, data: cargaCriada }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
