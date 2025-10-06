import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCargaPayload {
  numero_carga: string;
  tipo_temperatura: string;
  data_chegada_prevista?: string;
  origem?: string;
  destino?: string;
  transportadora?: string;
  mawb?: string;
  hawb?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid or missing authentication token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: CreateCargaPayload = await req.json();
    console.log('Received payload:', payload);

    // Validações
    if (!payload.numero_carga || typeof payload.numero_carga !== 'string') {
      return new Response(
        JSON.stringify({ error: 'numero_carga é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.tipo_temperatura || !['ambiente', 'controlada'].includes(payload.tipo_temperatura.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'tipo_temperatura deve ser "ambiente" ou "controlada"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se a carga já existe
    const { data: existingCarga } = await supabase
      .from('cargas')
      .select('numero_carga')
      .eq('numero_carga', payload.numero_carga.trim())
      .maybeSingle();

    if (existingCarga) {
      console.log(`Carga ${payload.numero_carga} já existe`);
      return new Response(
        JSON.stringify({ 
          message: 'Carga já existe',
          numero_carga: payload.numero_carga 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir nova carga
    const { data: newCarga, error: insertError } = await supabase
      .from('cargas')
      .insert({
        numero_carga: payload.numero_carga.trim(),
        tipo_temperatura: payload.tipo_temperatura.toLowerCase(),
        data_chegada_prevista: payload.data_chegada_prevista || null,
        origem: payload.origem?.trim() || null,
        destino: payload.destino?.trim() || null,
        transportadora: payload.transportadora?.trim() || null,
        mawb: payload.mawb?.trim() || null,
        hawb: payload.hawb?.trim() || null,
        status: 'No Armazém'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir carga:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar no histórico
    const { error: histError } = await supabase
      .from('carga_historico')
      .insert({
        numero_carga: payload.numero_carga.trim(),
        evento: 'Chegada ao Armazém',
        descricao: 'Carga recebida no armazém',
        localizacao: payload.origem?.trim() || 'Armazém'
      });

    if (histError) {
      console.error('Erro ao registrar histórico:', histError);
    }

    console.log(`Carga ${payload.numero_carga} criada com sucesso`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Carga criada com sucesso',
        carga: newCarga
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no create-carga:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
