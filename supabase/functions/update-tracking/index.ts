import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation functions
const sanitizeInput = (input: string, maxLength = 1000): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>'"&]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
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

    // Parse do body with size limit
    const text = await req.text();
    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await JSON.parse(text);
    
    // Validate required fields
    if (!data.sales_order || !data.status_atual || !data.data_ultima_atualizacao) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize inputs
    const salesOrder = sanitizeInput(data.sales_order, 100);
    const statusAtual = sanitizeInput(data.status_atual, 100);
    const statusCliente = data.status_cliente ? sanitizeInput(data.status_cliente, 100) : null;
    const ultimaLocalizacao = data.ultima_localizacao ? sanitizeInput(data.ultima_localizacao, 200) : null;

    if (!salesOrder || !statusAtual) {
      return new Response(JSON.stringify({ error: 'Invalid input data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate date
    if (!isValidDate(data.data_ultima_atualizacao)) {
      return new Response(JSON.stringify({ error: 'Invalid date format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📦 Recebido update validado para SO:', salesOrder);
    
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Atualizar envio no banco
    const { data: envio, error: envioError } = await supabase
      .from('envios_processados')
      .update({
        status_atual: statusAtual,
        status_cliente: statusCliente,
        ultima_localizacao: ultimaLocalizacao,
        data_ultima_atualizacao: data.data_ultima_atualizacao,
        is_at_warehouse: data.is_at_warehouse || false,
        is_delivered: data.is_delivered || false,
        updated_at: new Date().toISOString()
      })
      .eq('sales_order', salesOrder)
      .select()
      .single();

    if (envioError) {
      console.error('❌ Erro ao atualizar envio:', envioError);
      throw envioError;
    }

    console.log('✅ Envio atualizado:', envio.sales_order);

    // Registrar no histórico
    const { error: histError } = await supabase
      .from('shipment_history')
      .insert({
        sales_order: salesOrder,
        status: statusAtual,
        location: ultimaLocalizacao,
        description: JSON.stringify({
          tracking: data.tracking_number ? sanitizeInput(data.tracking_number, 100) : null,
          status_cliente: statusCliente,
          fonte: 'FedEx Tracking API'
        }),
        timestamp: data.data_ultima_atualizacao,
        created_at: new Date().toISOString()
      });

    if (histError) {
      console.error('⚠️ Erro ao inserir histórico:', histError);
      // Não falha se o histórico der erro
    } else {
      console.log('📝 Histórico registrado para SO:', salesOrder);
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
        error: 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
