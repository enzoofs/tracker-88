import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('🧹 Starting cleanup of old auth attempts and security logs...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Delete auth attempts older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedAttempts, error: attemptsError } = await supabase
      .from('auth_attempts')
      .delete()
      .lt('attempted_at', sevenDaysAgo)
      .select('id');

    if (attemptsError) {
      console.error('❌ Error deleting old auth attempts:', attemptsError);
      throw attemptsError;
    }

    const attemptsDeleted = deletedAttempts?.length || 0;
    console.log(`✅ Deleted ${attemptsDeleted} old auth attempts`);

    // Delete security logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedLogs, error: logsError } = await supabase
      .from('security_audit_log')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .select('id');

    if (logsError) {
      console.error('❌ Error deleting old security logs:', logsError);
      throw logsError;
    }

    const logsDeleted = deletedLogs?.length || 0;
    console.log(`✅ Deleted ${logsDeleted} old security logs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        deleted: {
          auth_attempts: attemptsDeleted,
          security_logs: logsDeleted,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
