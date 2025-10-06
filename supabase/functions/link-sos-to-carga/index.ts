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
      console.error('Invalid token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('Received payload:', payload);

    if (!payload.numero_carga) {
      console.error('Missing numero_carga');
      return new Response(
        JSON.stringify({ error: 'numero_carga obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const numeroCargaStr = String(payload.numero_carga).trim();
    let salesOrders = [];

    if (payload.sales_orders && Array.isArray(payload.sales_orders)) {
      salesOrders = payload.sales_orders.map(so => String(so).trim());
      console.log('Array format:', salesOrders.length, 'SOs');
    } else if (payload.so_number) {
      salesOrders = [String(payload.so_number).trim()];
      console.log('Single format: SO', payload.so_number);
    } else {
      console.error('No SOs provided');
      return new Response(
        JSON.stringify({ error: 'sales_orders ou so_number obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking carga:', numeroCargaStr);
    const { data: carga, error: cargaError } = await supabase
      .from('cargas')
      .select('numero_carga, origem')
      .eq('numero_carga', numeroCargaStr)
      .maybeSingle();

    if (cargaError || !carga) {
      console.error('Carga not found:', numeroCargaStr);
      return new Response(
        JSON.stringify({ error: `Carga ${numeroCargaStr} nao encontrada` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Carga found:', carga.numero_carga);

    const { data: existingSOs } = await supabase
      .from('envios_processados')
      .select('sales_order, is_delivered')
      .in('sales_order', salesOrders);

    const validSOs = existingSOs?.filter(so => !so.is_delivered).map(so => so.sales_order) || [];
    const deliveredSOs = existingSOs?.filter(so => so.is_delivered).map(so => so.sales_order) || [];
    
    if (deliveredSOs.length > 0) {
      console.log('⚠️ SOs already delivered:', deliveredSOs.join(', '));
      return new Response(
        JSON.stringify({ 
          error: `SOs ja entregues: ${deliveredSOs.join(', ')}`,
          rejected_sos: deliveredSOs
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (validSOs.length === 0) {
      console.log('No valid SOs found');
      return new Response(
        JSON.stringify({ error: 'Nenhuma SO valida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Valid SOs:', validSOs.length);

    const linksToInsert = validSOs.map(so => ({
      numero_carga: numeroCargaStr,
      so_number: so
    }));

    const { error: linkError } = await supabase
      .from('carga_sales_orders')
      .upsert(linksToInsert, { onConflict: 'numero_carga,so_number', ignoreDuplicates: true });

    if (linkError) {
      console.error('Link error:', linkError.message);
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Links created');

    await supabase
      .from('envios_processados')
      .update({
        status_atual: 'No Armazém',
        status_cliente: 'Em Importacao',
        is_at_warehouse: true,
        ultima_localizacao: carga.origem || 'Armazem'
      })
      .in('sales_order', validSOs);

    console.log('SOs updated');

    // Log linkage to carga_historico
    await supabase
      .from('carga_historico')
      .insert({
        numero_carga: numeroCargaStr,
        evento: 'SOs Vinculadas',
        descricao: `${validSOs.length} SOs vinculadas: ${validSOs.join(', ')}`,
        localizacao: carga.origem || 'Armazém',
        data_evento: new Date().toISOString()
      });

    console.log('Linkage logged to history');

    return new Response(
      JSON.stringify({
        success: true,
        total_vinculadas: validSOs.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
