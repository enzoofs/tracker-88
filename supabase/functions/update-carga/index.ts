// ============================================
// EDGE FUNCTION: update-carga
// Caminho: supabase/functions/update-carga/index.ts
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
    const data = await req.json();

    console.log("📥 Payload recebido:", JSON.stringify(data, null, 2));

    if (!data?.numero_carga) {
      console.error("❌ numero_carga ausente");
      return new Response(JSON.stringify({ error: "numero_carga é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔄 Atualizando carga:", data.numero_carga);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar carga atual
    const { data: cargaAtual, error: fetchError } = await supabase
      .from("cargas")
      .select("*")
      .eq("numero_carga", data.numero_carga)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Erro ao buscar carga:", fetchError.message);
      throw fetchError;
    }

    if (!cargaAtual) {
      console.error("❌ Carga não encontrada:", data.numero_carga);
      return new Response(JSON.stringify({ error: "Carga não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Carga encontrada:", cargaAtual.numero_carga);

    // Mapeamento de status (recebido do n8n → status do banco)
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

    // Montar updateData (SEM observacoes)
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.status_atual) {
      updateData.status = statusMap[data.status_atual] || cargaAtual.status;
      console.log(`📊 Status: ${cargaAtual.status} → ${updateData.status}`);
    }
    if (data.awb_number) {
      updateData.mawb = String(data.awb_number);
      console.log("✈️ MAWB:", updateData.mawb);
    }
    if (data.hawb_number) {
      updateData.hawb = String(data.hawb_number);
      console.log("📦 HAWB:", updateData.hawb);
    }
    if (data.localizacao) {
      updateData.ultima_localizacao = String(data.localizacao);
      console.log("📍 Localização:", updateData.ultima_localizacao);
    }

    // Datas reais (eventos)
    if (data.data_embarque_real) {
      updateData.data_embarque = data.data_embarque_real;
      console.log("📅 Data embarque real:", updateData.data_embarque);
    }
    if (data.data_chegada_real) {
      updateData.data_chegada = data.data_chegada_real;
      console.log("📅 Data chegada real:", updateData.data_chegada);
    }
    if (data.data_liberacao) {
      updateData.data_liberacao = data.data_liberacao;
      console.log("📅 Data liberação:", updateData.data_liberacao);
    }
    if (data.data_chegada_expedicao) {
      updateData.data_chegada_expedicao = data.data_chegada_expedicao;
      console.log("📅 Data chegada expedição:", updateData.data_chegada_expedicao);
    }
    if (data.data_entrega) {
      updateData.data_entrega = data.data_entrega;
      console.log("📅 Data entrega:", updateData.data_entrega);
    }

    // Previsões
    if (data.data_previsao_embarque) {
      updateData.data_embarque_prevista = data.data_previsao_embarque;
      console.log("📅 Previsão embarque:", updateData.data_embarque_prevista);
    }
    if (data.data_previsao_chegada) {
      updateData.data_chegada_prevista = data.data_previsao_chegada;
      console.log("📅 Previsão chegada:", updateData.data_chegada_prevista);
    }

    // ✅ Não há coluna 'invoices' em cargas → ignorar com log simples
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      console.log("📄 Invoices recebidas (ignoradas em 'cargas'):", data.invoices);
    }

    // HARD-SANITIZE: remover qualquer campo indevido (inclusive 'observacoes' se aparecer)
    const allowList = new Set([
      "updated_at",
      "status",
      "mawb",
      "hawb",
      "ultima_localizacao",
      "data_embarque",
      "data_chegada",
      "data_liberacao",
      "data_chegada_expedicao",
      "data_entrega",
      "data_embarque_prevista",
      "data_chegada_prevista",
    ]);
    for (const k of Object.keys(updateData)) {
      if (!allowList.has(k)) delete updateData[k];
    }
    // Se por qualquer motivo caiu 'observacoes' aqui, garanta remoção:
    // @ts-ignore
    delete updateData.observacoes;

    console.log("💾 Atualizando no banco (sanitizado):", JSON.stringify(updateData, null, 2));

    // Atualizar carga
    const { data: cargaAtualizada, error: updateError } = await supabase
      .from("cargas")
      .update(updateData)
      .eq("numero_carga", data.numero_carga)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar:", updateError.message);
      console.error("❌ Detalhes:", updateError);
      throw updateError;
    }

    console.log("✅ Carga atualizada:", cargaAtualizada.numero_carga);

    // Se marcou "Entregue", propagar para SOs vinculadas
    if (updateData.status === "Entregue") {
      console.log("📦 Atualizando SOs para status Entregue...");

      const { data: linkedSOs, error: linkedError } = await supabase
        .from("carga_sales_orders")
        .select("so_number")
        .eq("numero_carga", data.numero_carga);

      if (linkedError) {
        console.error("⚠️ Erro ao buscar SOs vinculadas:", linkedError.message);
      } else if (linkedSOs && linkedSOs.length > 0) {
        const soNumbers = linkedSOs.map((link) => link.so_number);
        console.log(`📋 Atualizando ${soNumbers.length} SOs:`, soNumbers);

        const { error: updateSOsError } = await supabase
          .from("envios_processados")
          .update({
            status_atual: "Entregue",
            status_cliente: "Entregue",
            is_delivered: true,
            data_ultima_atualizacao: new Date().toISOString(),
          })
          .in("sales_order", soNumbers);

        if (updateSOsError) {
          console.error("⚠️ Erro ao atualizar SOs:", updateSOsError.message);
        } else {
          console.log("✅ SOs atualizadas para Entregue");
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: cargaAtualizada,
        message: `Carga ${data.numero_carga} atualizada com sucesso`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Erro geral:", error?.message || String(error));
    console.error("❌ Stack:", error?.stack || "");
    return new Response(
      JSON.stringify({
        error: error?.message || "Internal error",
        details: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
