// ============================================
// 2. EDGE FUNCTION: update-carga
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

    console.log("🔄 Atualizando carga:", data.numero_carga);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Buscar carga atual para merge de dados
    const { data: cargaAtual, error: fetchError } = await supabase
      .from("cargas")
      .select("*")
      .eq("numero_carga", data.numero_carga)
      .single();

    if (fetchError || !cargaAtual) {
      return new Response(JSON.stringify({ error: "Carga não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mapeamento de status
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

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Atualizar status se fornecido
    if (data.status_atual) {
      updateData.status = statusMap[data.status_atual] || cargaAtual.status;
    }

    // Atualizar MAWB/HAWB se fornecidos
    if (data.awb_number) updateData.mawb = data.awb_number;
    if (data.hawb_number) updateData.hawb = data.hawb_number;

    // Atualizar localização se fornecida
    if (data.localizacao) updateData.ultima_localizacao = data.localizacao;

    // Atualizar observações se fornecidas
    if (data.observacoes) updateData.observacoes = data.observacoes;

    // Atualizar datas específicas de eventos
    if (data.data_embarque_real) updateData.data_embarque = data.data_embarque_real;
    if (data.data_chegada_real) updateData.data_chegada = data.data_chegada_real;
    if (data.data_liberacao) updateData.data_liberacao = data.data_liberacao;
    if (data.data_chegada_expedicao) updateData.data_chegada_expedicao = data.data_chegada_expedicao;
    if (data.data_entrega) updateData.data_entrega = data.data_entrega;

    // Atualizar previsões SE fornecidas
    if (data.data_previsao_embarque) {
      updateData.data_embarque_prevista = data.data_previsao_embarque;
    }
    if (data.data_previsao_chegada) {
      updateData.data_chegada_prevista = data.data_previsao_chegada;
    }

    // Merge de invoices (adicionar novas sem duplicar)
    if (data.invoices && Array.isArray(data.invoices) && data.invoices.length > 0) {
      const invoicesExistentes = cargaAtual.invoices || [];
      const invoicesMerged = [...new Set([...invoicesExistentes, ...data.invoices])];
      updateData.invoices = invoicesMerged;
    }

    console.log("📝 Dados a atualizar:", updateData);

    const { data: cargaAtualizada, error: updateError } = await supabase
      .from("cargas")
      .update(updateData)
      .eq("numero_carga", data.numero_carga)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro:", updateError.message);
      throw updateError;
    }

    console.log("✅ Carga atualizada");

    // Se a carga foi marcada como "Entregue", atualizar todas as SOs vinculadas
    if (updateData.status === "Entregue") {
      console.log('📦 Atualizando SOs para status "Entregue"...');

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
          console.log('✅ SOs atualizadas para "Entregue"');
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: cargaAtualizada }), {
      status: 200,
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

// ============================================
// 3. MIGRATION SQL NECESSÁRIA
// ============================================

/*
-- Adicionar colunas na tabela cargas
ALTER TABLE cargas
ADD COLUMN IF NOT EXISTS data_embarque_prevista TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_chegada_prevista TIMESTAMP,
ADD COLUMN IF NOT EXISTS hawb TEXT,
ADD COLUMN IF NOT EXISTS invoices JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_autorizacao TIMESTAMP,
ADD COLUMN IF NOT EXISTS ultima_localizacao TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cargas_invoices ON cargas USING GIN (invoices);
CREATE INDEX IF NOT EXISTS idx_cargas_hawb ON cargas(hawb);
CREATE INDEX IF NOT EXISTS idx_cargas_data_embarque_prevista ON cargas(data_embarque_prevista);
CREATE INDEX IF NOT EXISTS idx_cargas_data_chegada_prevista ON cargas(data_chegada_prevista);
*/
