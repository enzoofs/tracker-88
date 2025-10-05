import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sanitizeInput = (input: string, maxLength = 1000): string => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>'"&]/g, '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!token || token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    const salesOrder = sanitizeInput(payload.sales_order, 100);
    
    if (!salesOrder) {
      return new Response(
        JSON.stringify({ error: 'sales_order é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('🔄 UPSERT para SO:', salesOrder, {
      tracking: payload.tracking_numbers ? '✅' : '❌',
      status: payload.status_atual
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // UPSERT em envios_processados
    const { data, error } = await supabase
      .from('envios_processados')
      .upsert({
        sales_order: salesOrder,
        erp_order: payload.erp_order || null,
        web_order: payload.web_order || null,
        cliente: payload.cliente || 'Cliente não especificado',
        produtos: payload.produtos || 'Produtos não especificados',
        valor_total: payload.valor_total || 0,
        tracking_numbers: payload.tracking_numbers ? sanitizeInput(payload.tracking_numbers, 500) : null,
        data_envio: payload.data_envio,
        status: payload.status || 'Em Trânsito',
        status_atual: payload.status_atual || 'Em Trânsito',
        status_cliente: payload.status_cliente || payload.status_atual || 'Em Trânsito',
        ultima_localizacao: payload.ultima_localizacao || 'Em Trânsito',
        carrier: payload.carrier || 'FedEx',
        ship_to: payload.ship_to || null,
        data_ultima_atualizacao: new Date().toISOString()
      }, { 
        onConflict: 'sales_order',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Erro ao fazer upsert:', {
        sales_order: salesOrder,
        error: error.message,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Envio atualizado/criado:', salesOrder);

    // INSERT no histórico
    if (payload.tracking_numbers) {
      await supabase
        .from('shipment_history')
        .insert({
          sales_order: salesOrder,
          status: 'Atualizado',
          location: payload.ultima_localizacao,
          tracking_number: sanitizeInput(payload.tracking_numbers, 500),
          description: JSON.stringify({
            carrier: payload.carrier,
            fonte: 'Update via n8n'
          }),
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      
      console.log('📝 Histórico atualizado');
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});