import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate N8N token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!expectedToken) {
      console.error('N8N_SHARED_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (token !== expectedToken) {
      console.error('Invalid token provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body with size limit
    const text = await req.text();
    if (text.length > 100000) {
      return new Response(
        JSON.stringify({ error: 'Payload too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(text);
    console.log('Received payload for SO:', payload.sales_order);

    // Validate required fields
    const requiredFields = [
      'sales_order',
      'erp_order',
      'cliente',
      'produtos',
      'valor_total',
      'data_ultima_atualizacao',
      'web_order',
      'data_processamento'
    ];

    for (const field of requiredFields) {
      if (!(field in payload)) {
        console.error(`Missing required field: ${field}`);
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate and sanitize inputs
    const salesOrder = sanitizeInput(payload.sales_order, 100);
    const erpOrder = sanitizeInput(payload.erp_order, 100);
    const cliente = sanitizeInput(payload.cliente, 200);
    const webOrder = sanitizeInput(payload.web_order, 100);
    
    // ⭐ NOVO: Sanitize tracking numbers
    const trackingNumbers = payload.tracking_numbers ? sanitizeInput(payload.tracking_numbers, 500) : null;
    const carrier = payload.carrier ? sanitizeInput(payload.carrier, 50) : 'FedEx';
    const shipTo = payload.ship_to ? sanitizeInput(payload.ship_to, 200) : null;

    if (!salesOrder || !erpOrder || !cliente) {
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate dates
    const dataEnvio = payload.data_envio && isValidDate(payload.data_envio) ? payload.data_envio : null;
    
    if (!isValidDate(payload.data_ultima_atualizacao) || !isValidDate(payload.data_processamento)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate valor_total is a number
    const valorTotal = parseFloat(payload.valor_total);
    if (isNaN(valorTotal) || valorTotal < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid valor_total' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ⭐ ATUALIZADO: Prepare row with tracking info
    const row = {
      sales_order: salesOrder,
      erp_order: erpOrder,
      cliente: cliente,
      ship_to: shipTo,
      carrier: carrier,
      produtos: payload.produtos,
      tracking_numbers: trackingNumbers, // ⭐ ADICIONADO
      data_envio: dataEnvio, // ⭐ ADICIONADO
      valor_total: valorTotal,
      status: payload.status || 'Enviado', // ⭐ MUDADO de 'Em Produção'
      status_atual: payload.status_atual || 'Enviado', // ⭐ MUDADO
      status_cliente: payload.status_cliente || 'Preparando Envio',
      ultima_localizacao: payload.ultima_localizacao || 'Em Trânsito', // ⭐ MUDADO
      data_ultima_atualizacao: payload.data_ultima_atualizacao,
      web_order: webOrder,
      created_at: payload.created_at || payload.data_processamento
    };

    console.log('Inserting sanitized row for SO:', salesOrder);

    // Insert into database
    const { data, error } = await supabase
      .from('envios_processados')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully inserted SO:', salesOrder);

    // ⭐ NOVO: Inserir no histórico com tracking_number
    if (trackingNumbers) {
      const { error: histError } = await supabase
        .from('shipment_history')
        .insert({
          sales_order: salesOrder,
          status: payload.status || 'Enviado',
          location: payload.ultima_localizacao || 'Em Trânsito',
          tracking_number: trackingNumbers, // ⭐ CAMPO PRINCIPAL
          description: JSON.stringify({
            carrier: carrier,
            valor: valorTotal,
            produtos: payload.produtos,
            fonte: 'Automated Daily Shipment'
          }),
          timestamp: dataEnvio || payload.data_processamento,
          created_at: new Date().toISOString()
        });

      if (histError) {
        console.error('Warning: Failed to insert history:', histError);
        // Não falha a operação principal
      } else {
        console.log('✅ Histórico criado para SO:', salesOrder);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});