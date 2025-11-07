import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes: number;
}

const RATE_LIMITS: RateLimitConfig[] = [
  { maxAttempts: 3, windowMinutes: 60, blockDurationMinutes: 15 },
  { maxAttempts: 5, windowMinutes: 60, blockDurationMinutes: 60 },
  { maxAttempts: 10, windowMinutes: 60, blockDurationMinutes: 1440 }, // 24h
];

export async function checkRateLimit(
  req: Request,
  supabase: any,
  endpoint: string
): Promise<{ blocked: boolean; blockedUntil?: string; response?: Response }> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  const clientIP =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Verificar se IP está bloqueado
  const { data: blocked } = await supabase
    .from('auth_attempts')
    .select('blocked_until')
    .eq('ip_address', clientIP)
    .gt('blocked_until', new Date().toISOString())
    .order('blocked_until', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (blocked?.blocked_until) {
    return {
      blocked: true,
      blockedUntil: blocked.blocked_until,
      response: new Response(
        JSON.stringify({
          error: 'Too many failed attempts. Try again later.',
          blocked_until: blocked.blocked_until,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  return { blocked: false };
}

export async function recordFailedAttempt(
  supabase: any,
  req: Request,
  endpoint: string
): Promise<Date | null> {
  const clientIP =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Contar falhas recentes
  const windowStart = new Date(Date.now() - 60 * 60 * 1000); // Últimas 1h
  const { data: failures } = await supabase
    .from('auth_attempts')
    .select('id')
    .eq('ip_address', clientIP)
    .eq('endpoint', endpoint)
    .eq('success', false)
    .gte('attempted_at', windowStart.toISOString());

  const failureCount = (failures?.length || 0) + 1; // +1 para incluir a tentativa atual

  let blockedUntil: Date | null = null;

  // Determinar duração do bloqueio baseado no número de falhas
  for (const limit of RATE_LIMITS.reverse()) {
    if (failureCount >= limit.maxAttempts) {
      blockedUntil = new Date(Date.now() + limit.blockDurationMinutes * 60 * 1000);
      break;
    }
  }

  // Registrar tentativa falha
  await supabase.from('auth_attempts').insert({
    ip_address: clientIP,
    endpoint: endpoint,
    success: false,
    blocked_until: blockedUntil?.toISOString() || null,
  });

  return blockedUntil;
}

export async function recordSuccessfulAttempt(
  supabase: any,
  req: Request,
  endpoint: string
): Promise<void> {
  const clientIP =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Registrar tentativa bem-sucedida
  await supabase.from('auth_attempts').insert({
    ip_address: clientIP,
    endpoint: endpoint,
    success: true,
    blocked_until: null,
  });
}
