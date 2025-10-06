import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Verificando autenticação...');
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!token || token !== expectedToken) {
      console.error('❌ Token inválido');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    console.log('📥 Payload:', JSON.stringify(payload, null, 2));

    const data = payload;
    
    if (!data.numero_carga) {
      console.error('❌ numero_carga ausente');
      return new Response(
        JSON.stringify({ error: 'numero_carga é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Criando carga:', data.numero_carga);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Mapear campos para a estrutura correta da tabela
    const insertData = {
      numero_carga: data.numero_carga,
      status: data.status || 'Em Consolidação',
      tipo_temperatura: data.temperatura_controlada ? 'Controlada' : 'Ambiente',
      data_embarque: data.data_embarque || null,
      data_chegada_prevista: data.data_chegada_prevista || null,
      origem: data.origem || 'Miami, FL',
      destino: data.destino || 'Confins, MG',
      mawb: data.awb_number || data.mawb || null,
      hawb: data.hawb || null,
      transportadora: data.transportadora || 'Não especificado',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('💾 Inserindo:', JSON.stringify(insertData, null, 2));

    const { data: cargaInserida, error: insertError } = await supabase
      .from('cargas')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro:', insertError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao inserir carga', 
          details: insertError.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Carga inserida:', cargaInserida.numero_carga);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cargaInserida,
        message: `Carga ${data.numero_carga} criada com sucesso`
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});