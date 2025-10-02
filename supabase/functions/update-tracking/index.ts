import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autorização
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Unauthorized access attempt');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse do body
    const data = await req.json();
    console.log('📦 Recebido update para SO:', data.sales_order);
    
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Atualizar envio no banco
    const { data: envio, error: envioError } = await supabase
      .from('envios_processados')
      .update({
        status_atual: data.status_atual,
        status_cliente: data.status_cliente,
        ultima_localizacao: data.ultima_localizacao,
        data_ultima_atualizacao: data.data_ultima_atualizacao,
        is_at_warehouse: data.is_at_warehouse || false,
        is_delivered: data.is_delivered || false,
        updated_at: new Date().toISOString()
      })
      .eq('sales_order', data.sales_order)
      .select()
      .single();

    if (envioError) {
      console.error('❌ Erro ao atualizar envio:', envioError);
      throw envioError;
    }

    console.log('✅ Envio atualizado:', envio.sales_order);

    // Registrar no histórico (usando campos corretos da tabela shipment_history)
    const { error: histError } = await supabase
      .from('shipment_history')
      .insert({
        sales_order: data.sales_order,
        status: data.status_atual,
        location: data.ultima_localizacao,
        description: JSON.stringify({
          tracking: data.tracking_number,
          status_cliente: data.status_cliente,
          fonte: 'FedEx Tracking API'
        }),
        timestamp: data.data_ultima_atualizacao,
        created_at: new Date().toISOString()
      });

    if (histError) {
      console.error('⚠️ Erro ao inserir histórico:', histError);
      // Não falha se o histórico der erro
    } else {
      console.log('📝 Histórico registrado para SO:', data.sales_order);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: envio,
        message: 'Tracking atualizado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro na função update-tracking:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});