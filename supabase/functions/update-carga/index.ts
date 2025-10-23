// ============================================
// EDGE FUNCTION: update-carga  (v2.1.0-canary)
// ============================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const VERSION = "v2.1.0-canary";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Function-Version": VERSION,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🟢 update-carga", VERSION);

    // Auth
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

    // Payload
    const data = await req.json();
    console.log("📥 Payload recebido:", JSON.stringify(data, null, 2));
    if (!data?.numero_carga) {
      return new Response(JSON.stringify({ error: "numero_carga é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("SUPABASE_URL/KEY ausentes");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Busca carga
    const { data: cargaAtual, error: fetchError } = await supabase
      .from("cargas")
      .select("*")
      .eq("numero_carga", data.numero_carga)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!cargaAtual) {
      return new Response(JSON.stringify({ error: "Carga não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map de status
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

    // Monta update (sem observacoes, sem invoices)
    const u: Record<string, any> = { updated_at: new Date().toISOString() };

    if (data.status_atual) u.status = statusMap[data.status_atual] || cargaAtual.status;
    if (data.awb_number) u.mawb = String(data.awb_number);
    if (data.hawb_number) u.hawb = String(data.hawb_number);
    if (data.localizacao) u.ultima_localizacao = String(data.localizacao);

    if (data.data_embarque_real) u.data_embarque = data.data_embarque_real;
    if (data.data_chegada_real) u.data_chegada = data.data_chegada_real;
    if (data.data_liberacao) u.data_liberacao = data.data_liberacao;
    if (data.data_chegada_expedicao) u.data_chegada_expedicao = data.data_chegada_expedicao;
    if (data.data_entrega) u.data_entrega = data.data_entrega;

    if (data.data_previsao_embarque) u.data_embarque_prevista = data.data_previsao_embarque;
    if (data.data_previsao_chegada) u.data_chegada_prevista = data.data_previsao_chegada;

    // Canivete suíço: remova qualquer sujeira
    delete (u as any).observacoes;
    // Whitelist final
    const allow = new Set([
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
    for (const k of Object.keys(u)) if (!allow.has(k)) delete u[k];

    console.log("🧹 UPDATE SANITIZADO (sem observacoes):", JSON.stringify(u, null, 2));

    // Atualiza
    const { data: cargaAtualizada, error: updateError } = await supabase
      .from("cargas")
      .update(u)
      .eq("numero_carga", data.numero_carga)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar:", updateError);
      throw updateError;
    }

    // Propaga entregue
    if (u.status === "Entregue") {
      const { data: linkedSOs } = await supabase
        .from("carga_sales_orders")
        .select("so_number")
        .eq("numero_carga", data.numero_carga);
      if (linkedSOs?.length) {
        const soNumbers = linkedSOs.map((x) => x.so_number);
        const { error: updSOErr } = await supabase
          .from("envios_processados")
          .update({
            status_atual: "Entregue",
            status_cliente: "Entregue",
            is_delivered: true,
            data_ultima_atualizacao: new Date().toISOString(),
          })
          .in("sales_order", soNumbers);
        if (updSOErr) console.error("⚠️ Erro ao atualizar SOs:", updSOErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        version: VERSION,
        updated_fields: Object.keys(u),
        data: cargaAtualizada,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Erro geral:", error?.message || String(error));
    return new Response(JSON.stringify({ error: error?.message || "Internal error", version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
