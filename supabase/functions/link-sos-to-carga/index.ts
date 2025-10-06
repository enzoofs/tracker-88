import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkSOsPayload {
  numero_carga: string;
  sales_orders: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid or missing authentication token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: LinkSOsPayload = await req.json();
    console.log('Received payload:', payload);

    // Validações
    if (!payload.numero_carga || typeof payload.numero_carga !== 'string') {
      return new Response(
        JSON.stringify({ error: 'numero_carga é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(payload.sales_orders) || payload.sales_orders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'sales_orders deve ser um array não vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se a carga existe
    const { data: carga, error: cargaError } = await supabase
      .from('cargas')
      .select('numero_carga, origem')
      .eq('numero_carga', payload.numero_carga.trim())
      .maybeSingle();

    if (cargaError || !carga) {
      console.error('Carga não encontrada:', payload.numero_carga);
      return new Response(
        JSON.stringify({ error: `Carga ${payload.numero_carga} não encontrada` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar quais SOs existem
    const { data: existingSOs, error: soError } = await supabase
      .from('envios_processados')
      .select('sales_order')
      .in('sales_order', payload.sales_orders);

    if (soError) {
      console.error('Erro ao buscar SOs:', soError);
      return new Response(
        JSON.stringify({ error: soError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validSOs = existingSOs?.map(so => so.sales_order) || [];
    const invalidSOs = payload.sales_orders.filter(so => !validSOs.includes(so));

    if (validSOs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma SO válida encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados para insert (bulk)
    const linksToInsert = validSOs.map(so => ({
      numero_carga: payload.numero_carga.trim(),
      so_number: so
    }));

    // Inserir vínculos (ignorar duplicatas)
    const { data: insertedLinks, error: linkError } = await supabase
      .from('carga_sales_orders')
      .upsert(linksToInsert, { onConflict: 'numero_carga,so_number', ignoreDuplicates: true })
      .select();

    if (linkError) {
      console.error('Erro ao vincular SOs:', linkError);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar status das SOs
    const { error: updateError } = await supabase
      .from('envios_processados')
      .update({
        status_atual: 'No Armazém',
        is_at_warehouse: true,
        ultima_localizacao: carga.origem || 'Armazém'
      })
      .in('sales_order', validSOs);

    if (updateError) {
      console.error('Erro ao atualizar status das SOs:', updateError);
    }

    // Registrar no histórico da carga
    const { error: histError } = await supabase
      .from('carga_historico')
      .insert({
        numero_carga: payload.numero_carga.trim(),
        evento: 'Consolidação',
        descricao: `${validSOs.length} SOs consolidadas na carga`,
        localizacao: carga.origem || 'Armazém'
      });

    if (histError) {
      console.error('Erro ao registrar histórico:', histError);
    }

    console.log(`${validSOs.length} SOs vinculadas à carga ${payload.numero_carga}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SOs vinculadas com sucesso',
        total_vinculadas: validSOs.length,
        sales_orders_vinculadas: validSOs,
        sales_orders_invalidas: invalidSOs
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no link-sos-to-carga:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
