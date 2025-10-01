import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Parse request body
    const payload = await req.json();
    console.log('Received payload:', JSON.stringify(payload));

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare row for insertion
    const row = {
      sales_order: payload.sales_order,
      erp_order: payload.erp_order,
      cliente: payload.cliente,
      produtos: payload.produtos,
      valor_total: payload.valor_total,
      status: 'Em Produção',
      status_atual: 'Em Produção',
      ultima_localizacao: 'Fornecedor',
      data_ultima_atualizacao: payload.data_ultima_atualizacao,
      web_order: payload.web_order,
      created_at: payload.data_processamento
    };

    console.log('Inserting row:', JSON.stringify(row));

    // Insert into database
    const { data, error } = await supabase
      .from('envios_processados')
      .insert(row)
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully inserted:', JSON.stringify(data));

    return new Response(
      JSON.stringify({ ok: true, data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
