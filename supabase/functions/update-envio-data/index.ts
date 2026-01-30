import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnvioUpdate {
  sales_order: string;
  data_envio?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { updates } = await req.json() as { updates: EnvioUpdate[] };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'updates array é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (updates.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 200 atualizações por chamada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let errors = 0;
    const details: { sales_order: string; success: boolean; message: string }[] = [];

    for (const update of updates) {
      if (!update.sales_order) {
        details.push({ sales_order: '', success: false, message: 'sales_order é obrigatório' });
        errors++;
        continue;
      }

      const updateData: Record<string, any> = {};

      if (update.data_envio !== undefined) {
        updateData.data_envio = update.data_envio;
      }

      if (Object.keys(updateData).length === 0) {
        details.push({ sales_order: update.sales_order, success: false, message: 'Nenhum campo para atualizar' });
        continue;
      }

      const { error } = await supabase
        .from('envios_processados')
        .update(updateData)
        .eq('sales_order', update.sales_order);

      if (error) {
        console.error(`Erro ao atualizar SO ${update.sales_order}:`, error);
        details.push({ sales_order: update.sales_order, success: false, message: error.message });
        errors++;
      } else {
        details.push({ sales_order: update.sales_order, success: true, message: 'Atualizado' });
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, errors, details }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
