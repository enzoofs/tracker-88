import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sales_orders } = await req.json() as { sales_orders: string[] };

    if (!sales_orders || !Array.isArray(sales_orders) || sales_orders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'sales_orders array é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size to prevent abuse
    if (sales_orders.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 500 SOs por consulta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabase
      .from('envios_processados')
      .select('id, sales_order, data_envio, status_atual, is_delivered, is_at_warehouse, tracking_numbers, data_ultima_atualizacao')
      .in('sales_order', sales_orders);

    if (error) {
      throw new Error(`Erro ao consultar envios: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ data: data || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
