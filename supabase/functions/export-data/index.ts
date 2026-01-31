import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist de tabelas permitidas
const ALLOWED_TABLES = [
  'envios_processados',
  'cargas',
  'carga_sales_orders',
  'carga_historico',
  'shipment_history',
  'tracking_master',
  'clientes',
  'clientes_contact_info',
  'customer_assignments',
  'active_alerts',
  'alert_rules',
  'notificacoes',
  'notification_queue',
  'profiles',
  'auth_attempts',
  'security_audit_log',
  'user_roles',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { table } = await req.json() as { table: string };

    if (!table || typeof table !== 'string') {
      return new Response(
        JSON.stringify({ error: 'O campo "table" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar se a tabela está na whitelist
    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ 
          error: `Tabela "${table}" não permitida`,
          allowed_tables: ALLOWED_TABLES 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Exportando dados da tabela: ${table}`);

    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`❌ Erro ao consultar tabela ${table}:`, error.message);
      throw new Error(`Erro ao consultar tabela: ${error.message}`);
    }

    console.log(`✅ Exportados ${data?.length || 0} registros de ${table}`);

    return new Response(
      JSON.stringify({ 
        table,
        count: data?.length || 0,
        data: data || [] 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
