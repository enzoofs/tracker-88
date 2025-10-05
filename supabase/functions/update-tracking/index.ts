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
    
    console.log('🔄 UPDATE para SO:', salesOrder);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // UPDATE em envios_processados
    const { data, error } = await supabase
      .from('envios_processados')
      .update({
        tracking_numbers: payload.tracking_numbers ? sanitizeInput(payload.tracking_numbers, 500) : null,
        data_envio: payload.data_envio,
        status: payload.status,
        status_atual: payload.status_atual,
        ultima_localizacao: payload.ultima_localizacao,
        carrier: payload.carrier,
        data_ultima_atualizacao: new Date().toISOString()
      })
      .eq('sales_order', salesOrder)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar:', error);
      throw error;
    }

    console.log('✅ Envio atualizado:', salesOrder);

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