// ============================================
// EDGE FUNCTION: upsert-carga
// Caminho: supabase/functions/upsert-carga/index.ts
//
// NOVA FUNÇÃO QUE SUBSTITUI create-carga + update-carga
// Resolve o problema de emails de atualização chegando antes do pré-alerta
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // 0. RATE LIMITING
    // ============================================
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rateLimitCheck = await checkRateLimit(req, supabase, '/functions/upsert-carga');
    if (rateLimitCheck.blocked) {
      return rateLimitCheck.response!;
    }

    // ============================================
    // 1. AUTENTICAÇÃO
    // ============================================
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    const expectedToken = Deno.env.get("N8N_SHARED_TOKEN");

    if (!token || token !== expectedToken) {
      console.error("❌ Token inválido");
      await recordFailedAttempt(supabase, req, '/functions/upsert-carga');
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await recordSuccessfulAttempt(supabase, req, '/functions/upsert-carga');

    // ============================================
    // 2. VALIDAÇÃO DO PAYLOAD
    // ============================================
    const payload = await req.json();
    const data = payload ?? {};

    console.log("📥 Payload recebido:", JSON.stringify(data, null, 2));

    if (!data.numero_carga) {
      console.error("❌ numero_carga ausente");
      return new Response(JSON.stringify({ error: "numero_carga é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔄 Processando carga:", data.numero_carga);

    // ============================================
    // 4. BUSCAR CARGA EXISTENTE
    // ============================================
    const { data: cargaExistente, error: fetchError } = await supabase
      .from("cargas")
      .select("*")
      .eq("numero_carga", data.numero_carga)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Erro ao buscar carga:", fetchError.message);
      throw fetchError;
    }

    // ============================================
    // 5. PREPARAR DADOS COMUNS
    // ============================================
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // PROTEÇÃO: Não permitir reverter status de carga já entregue
    const statusEntregue = cargaExistente?.status === "Entregue";
    
    // Status (sem mapeamento - usa direto do workflow)
    if (data.status_atual) {
      // Se a carga já está entregue, só permite atualizar se o novo status também for "Entregue"
      if (statusEntregue && data.status_atual !== "Entregue") {
        console.log(`⚠️ PROTEÇÃO: Carga ${data.numero_carga} já está entregue - ignorando mudança de status para "${data.status_atual}"`);
      } else {
        updateData.status = data.status_atual;
      }
    }

    // MAWB/HAWB
    if (data.awb_number) {
      updateData.mawb = String(data.awb_number);
    }
    if (data.hawb_number) {
      updateData.hawb = String(data.hawb_number);
    }

    // Localização
    if (data.localizacao) {
      updateData.ultima_localizacao = String(data.localizacao);
    }

    // Datas de eventos reais
    if (data.data_embarque_real) {
      updateData.data_embarque = data.data_embarque_real;
    }
    if (data.data_chegada_real) {
      updateData.data_chegada = data.data_chegada_real;
    }
    if (data.data_liberacao) {
      updateData.data_liberacao = data.data_liberacao;
    }
    if (data.data_chegada_expedicao) {
      updateData.data_chegada_expedicao = data.data_chegada_expedicao;
    }
    if (data.data_entrega) {
      updateData.data_entrega = data.data_entrega;
    }

    // Previsões (só atualiza se fornecidas)
    if (data.data_previsao_embarque) {
      updateData.data_embarque_prevista = data.data_previsao_embarque;
    }
    if (data.data_previsao_chegada) {
      updateData.data_chegada_prevista = data.data_previsao_chegada;
    }

    // Invoices
    if (Array.isArray(data.invoices) && data.invoices.length > 0) {
      updateData.invoices = data.invoices;
    }

    // ============================================
    // 6. DECISÃO: UPDATE OU INSERT
    // ============================================

    if (cargaExistente) {
      // ====================================
      // CENÁRIO A: CARGA EXISTE → UPDATE
      // ====================================
      console.log("✅ Carga encontrada - Atualizando:", cargaExistente.numero_carga);

      // Verificar se há mudanças
      const hasChanges = Object.keys(updateData).length > 1; // > 1 porque sempre tem updated_at
      if (!hasChanges) {
        console.log("⚠️ Nenhuma mudança detectada");
        return new Response(
          JSON.stringify({
            success: true,
            action: "no_changes",
            data: cargaExistente,
            message: `Nenhuma mudança para carga ${data.numero_carga}`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Log das mudanças
      console.log("📊 Mudanças detectadas:");
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== "updated_at") {
          const oldValue = cargaExistente[key];
          if (oldValue !== value) {
            console.log(`  - ${key}: ${oldValue} → ${value}`);
          }
        }
      });

      console.log("💾 Atualizando no banco:", JSON.stringify(updateData, null, 2));

      // Executar update
      const { data: cargaAtualizada, error: updateError } = await supabase
        .from("cargas")
        .update(updateData)
        .eq("numero_carga", data.numero_carga)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Erro ao atualizar:", updateError.message);
        throw updateError;
      }

      console.log("✅ Carga atualizada com sucesso");

      // Atualizar SOs se status = Entregue
      if (updateData.status === "Entregue") {
        await atualizarSOsParaEntregue(supabase, data.numero_carga);
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "updated",
          data: cargaAtualizada,
          message: `Carga ${data.numero_carga} atualizada com sucesso`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } else {
      // ====================================
      // CENÁRIO B: CARGA NÃO EXISTE → INSERT
      // ====================================
      console.log("🆕 Carga não encontrada - Criando nova:", data.numero_carga);

      // Preparar dados de inserção (merge de updateData + dados obrigatórios)
      const insertData: Record<string, any> = {
        numero_carga: data.numero_carga,
        status: updateData.status || "No Armazém",
        origem: data.origem || "Miami, FL",
        destino: data.destino || "Confins, MG",
        tipo_temperatura: data.temperatura_controlada ? "Controlada" : "Ambiente",
        transportadora: data.transportadora || "Não especificado",
        created_at: new Date().toISOString(),
        ...updateData, // Merge dos dados já preparados
      };

      // Adicionar data de autorização se fornecida
      if (data.data_autorizacao) {
        insertData.data_autorizacao = data.data_autorizacao;
      }

      console.log("💾 Inserindo no banco:", JSON.stringify(insertData, null, 2));

      // Executar insert
      const { data: cargaCriada, error: insertError } = await supabase
        .from("cargas")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("❌ Erro ao inserir:", insertError.message);
        throw insertError;
      }

      console.log("✅ Carga criada com sucesso");

      return new Response(
        JSON.stringify({
          success: true,
          action: "created",
          data: cargaCriada,
          message: `Carga ${data.numero_carga} criada com sucesso`,
          warning: "Carga criada a partir de atualização - pode estar faltando pré-alerta",
        }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
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

// ============================================
// FUNÇÃO AUXILIAR: Atualizar SOs para Entregue
// ============================================
async function atualizarSOsParaEntregue(supabase: any, numeroCarga: string) {
  console.log("📦 Atualizando SOs para status Entregue...");

  const { data: linkedSOs, error: linkedError } = await supabase
    .from("carga_sales_orders")
    .select("so_number")
    .eq("numero_carga", numeroCarga);

  if (linkedError) {
    console.error("⚠️ Erro ao buscar SOs vinculadas:", linkedError.message);
    return;
  }

  if (!linkedSOs || linkedSOs.length === 0) {
    console.log("ℹ️ Nenhuma SO vinculada encontrada");
    return;
  }

  const soNumbers = linkedSOs.map((link: any) => link.so_number);
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
