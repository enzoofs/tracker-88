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
    console.log('📥 Payload recebido:', JSON.stringify(payload));

    // Extrair dados - pode vir como objeto ou array
    const data = Array.isArray(payload) ? payload[0] : payload;
    
    // Validar numero_carga
    if (!data.numero_carga) {
      console.error('❌ numero_carga ausente:', data);
      return new Response(
        JSON.stringify({ error: 'numero_carga é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Criando carga:', data.numero_carga);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Inserir carga
    const { data: cargaInserida, error: insertError } = await supabase
      .from('cargas')
      .insert({
        numero_carga: data.numero_carga,
        status: data.status || 'Em Consolidação',
        origem: data.origem || 'Miami, FL',
        destino: data.destino || 'Confins, MG',
        ultima_localizacao: data.ultima_localizacao || 'Armazém Miami',
        awb_number: data.awb_number,
        temperatura_controlada: data.temperatura_controlada || false,
        observacoes: data.observacoes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir carga:', insertError);
      throw insertError;
    }

    console.log('✅ Carga inserida:', cargaInserida.numero_carga);

    // Registrar histórico
    const { error: histError } = await supabase
      .from('carga_historico')
      .insert({
        tipo: 'carga_historico',
        numero_carga: data.numero_carga,
        evento: 'Carga Criada',
        data_evento: new Date().toISOString(),
        detalhes: JSON.stringify({ 
          fonte: 'Email Pré-Alerta',
          temperatura_controlada: data.temperatura_controlada,
          observacoes: data.observacoes
        }),
        fonte: 'Email Tracking',
        created_at: new Date().toISOString()
      });

    if (histError) {
      console.error('⚠️ Erro ao registrar histórico:', histError);
    } else {
      console.log('📝 Histórico registrado');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: cargaInserida,
        message: `Carga ${data.numero_carga} criada com sucesso`
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});