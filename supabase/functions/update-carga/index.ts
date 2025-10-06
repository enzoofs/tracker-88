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
    const data = payload;
    
    if (!data.numero_carga) {
      return new Response(
        JSON.stringify({ error: 'numero_carga é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Atualizando carga:', data.numero_carga);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const updateData: Record<string, any> = {
      status: data.status_atual,
      mawb: data.awb_number || data.mawb,
      hawb: data.hawb,
      updated_at: new Date().toISOString()
    };

    // Adicionar campos de data específicos se existirem
    if (data.data_embarque_real) updateData.data_embarque = data.data_embarque_real;
    if (data.data_chegada_real) updateData.data_chegada_prevista = data.data_chegada_real;

    const { data: cargaAtualizada, error: updateError } = await supabase
      .from('cargas')
      .update(updateData)
      .eq('numero_carga', data.numero_carga)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro:', updateError.message);
      throw updateError;
    }

    console.log('✅ Carga atualizada');

    return new Response(
      JSON.stringify({ success: true, data: cargaAtualizada }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
