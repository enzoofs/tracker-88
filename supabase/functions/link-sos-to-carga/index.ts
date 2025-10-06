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

    // Converter numero_carga para string ANTES de usar trim
    const numeroCargaStr = String(payload.numero_carga).trim();
    let salesOrders: string[] = [];

    // Detectar formato
    if (payload.sales_orders && Array.isArray(payload.sales_orders)) {
      salesOrders = payload.sales_orders;
      console.log(`Formato array: ${salesOrders.length} SOs`);
    } else if (payload.so_number) {
      salesOrders = [String(payload.so_number).trim()];
      console.log(`Formato objeto único: SO ${payload.so_number}`);
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
      .eq('numero_carga', numeroCargaStr)
      .maybeSingle();

    if (cargaError || !carga) {
      console.error('Carga não encontrada:', numeroCargaStr);
      return new Response(
        JSON.stringify({ error: `Carga ${numeroCargaStr} não encontrada` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Carga ${numeroCargaStr} encontrada`);

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
      console.log(`⚠️ Nenhuma SO válida. Tentadas: ${salesOrders.join(', ')}`);
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
      numero_carga: numeroCargaStr,
      so_number: so
    }));

    console.log(`📝 Inserindo ${linksToInsert.length} vínculos`);

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

    console.log(`✅ ${validSOs.length} vínculos criados`);

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
    } else {
      console.log(`✅ ${validSOs.length} SOs atualizadas`);
    }

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