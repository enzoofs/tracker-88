import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const payload = await req.json();
    console.log('Received payload:', payload);

    // Validar numero_carga
    if (!payload.numero_carga) {
      return new Response(
        JSON.stringify({ error: 'numero_carga é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let salesOrders: string[] = [];

    // Detectar formato: array (antigo) ou objeto único (novo)
    if (payload.sales_orders && Array.isArray(payload.sales_orders)) {
      // Formato antigo: { numero_carga: "890", sales_orders: ["SO1", "SO2"] }
      salesOrders = payload.sales_orders;
      console.log(`Formato array detectado: ${salesOrders.length} SOs`);
    } else if (payload.so_number) {
      // Formato novo: { numero_carga: 890, so_number: "SO1" }
      salesOrders = [payload.so_number];
      console.log(`Formato objeto único detectado: SO ${payload.so_number}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'sales_orders ou so_number é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (salesOrders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma SO fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a carga existe
    const { data: carga, error: cargaError } = await supabase
      .from('cargas')
      .select('numero_carga, origem')
      .eq('numero_carga', payload.numero_carga.toString().trim())
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
      .in('sales_order', salesOrders);

    if (soError) {
      console.error('Erro ao buscar SOs:', soError);
      return new Response(
        JSON.stringify({ error: soError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validSOs = existingSOs?.map(so => so.sales_order) || [];
    const invalidSOs = salesOrders.filter(so => !validSOs.includes(so));

    if (validSOs.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Nenhuma SO válida encontrada',
          invalid_sos: invalidSOs 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados para insert
    const linksToInsert = validSOs.map(so => ({
      numero_carga: payload.numero_carga.toString().trim(),
      so_number: so
    }));

    // Inserir vínculos
    const { data: insertedLinks, error: linkError } = await supabase
      .from('carga_sales_orders')
      .upsert(linksToInsert, { 
        onConflict: 'numero_carga,so_number', 
        ignoreDuplicates: true 
      })
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
        status_cliente: 'Em Importação',
        is_at_warehouse: true,
        ultima_localizacao: carga.origem || 'Armazém'
      })
      .in('sales_order', validSOs);

    if (updateError) {
      console.error('Erro ao atualizar status das SOs:', updateError);
    }

    console.log(`${validSOs.length} SOs vinculadas à carga ${payload.numero_carga}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SOs vinculadas com sucesso',
        total_vinculadas: validSOs.length,
        sales_orders_vinculadas: validSOs,
        sales_orders_invalidas: invalidSOs.length > 0 ? invalidSOs : undefined
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