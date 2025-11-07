import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { checkRateLimit, recordFailedAttempt, recordSuccessfulAttempt } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import translation function
const STATUS_TRANSLATIONS: Record<string, string> = {
  'Departed FedEx location': 'Saiu da Localização FedEx',
  'At FedEx destination facility': 'Na Instalação FedEx de Destino',
  'On FedEx vehicle for delivery': 'Em Veículo FedEx para Entrega',
  'In transit': 'Em Trânsito',
  'Delivered': 'Entregue',
  'Shipment exception': 'Exceção no Envio',
  'Held at FedEx location': 'Retido na Localização FedEx',
  'Picked up': 'Coletado',
  'At local FedEx facility': 'Na Instalação FedEx Local',
  'In clearance': 'Em Desembaraço',
  'Customs cleared': 'Liberado pela Alfândega',
  'Left FedEx origin facility': 'Saiu da Instalação FedEx de Origem',
  'Arrived at FedEx location': 'Chegou na Localização FedEx',
  'Shipment information sent': 'Informações de Envio Transmitidas',
  'Package available for clearance': 'Pacote Disponível para Desembaraço',
  'At destination sort facility': 'Em Distribuição FedEx',
};

const translateFedExStatus = (status: string): string => {
  if (!status) return status;
  
  if (STATUS_TRANSLATIONS[status]) {
    return STATUS_TRANSLATIONS[status];
  }
  
  const statusLower = status.toLowerCase();
  for (const [key, value] of Object.entries(STATUS_TRANSLATIONS)) {
    if (statusLower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return status;
};

const sanitizeInput = (input: string, maxLength = 1000): string => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>'"&]/g, '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client early for rate limiting
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check rate limit BEFORE authentication
  const rateLimitCheck = await checkRateLimit(req, supabase, '/functions/update-tracking');
  if (rateLimitCheck.blocked) {
    console.warn(`⚠️ IP blocked until: ${rateLimitCheck.blockedUntil}`);
    return rateLimitCheck.response!;
  }

  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const expectedToken = Deno.env.get('N8N_SHARED_TOKEN');
    
    if (!token || token !== expectedToken) {
      await recordFailedAttempt(supabase, req, '/functions/update-tracking');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token válido - registrar sucesso
    await recordSuccessfulAttempt(supabase, req, '/functions/update-tracking');

    const payload = await req.json();
    const salesOrder = sanitizeInput(payload.sales_order, 100);
    
    if (!salesOrder) {
      return new Response(
        JSON.stringify({ error: 'sales_order é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('🔄 UPSERT para SO:', salesOrder, {
      tracking: payload.tracking_numbers ? '✅' : '❌',
      status: payload.status_atual
    });

    // Supabase client already initialized

    // Check if record exists
    const { data: existing } = await supabase
      .from('envios_processados')
      .select('*')
      .eq('sales_order', salesOrder)
      .single();

    let data, error;

    if (existing) {
      // UPDATE existing record - only update status and tracking fields
      console.log('📝 Atualizando SO existente:', salesOrder, {
        campos_preservados: {
          cliente: existing.cliente,
          produtos: existing.produtos ? '✅' : '❌',
          valor_total: existing.valor_total,
          erp_order: existing.erp_order,
          web_order: existing.web_order
        }
      });

      const updateData: any = {
        data_ultima_atualizacao: new Date().toISOString()
      };

      // Only update status fields
      if (payload.status) updateData.status = translateFedExStatus(payload.status);
      if (payload.status_atual) updateData.status_atual = translateFedExStatus(payload.status_atual);
      if (payload.status_cliente) updateData.status_cliente = translateFedExStatus(payload.status_cliente);
      if (payload.ultima_localizacao) updateData.ultima_localizacao = translateFedExStatus(payload.ultima_localizacao);
      
      // Update tracking info if provided
      if (payload.tracking_numbers) {
        updateData.tracking_numbers = sanitizeInput(payload.tracking_numbers, 500);
      }
      if (payload.carrier) updateData.carrier = payload.carrier;
      if (payload.ship_to) updateData.ship_to = payload.ship_to;
      if (payload.data_envio) updateData.data_envio = payload.data_envio;

      // Update delivery flags based on status
      if (payload.status_atual) {
        const translatedStatus = translateFedExStatus(payload.status_atual);
        updateData.is_at_warehouse = translatedStatus.toLowerCase().includes('armazém');
        updateData.is_delivered = translatedStatus.toLowerCase().includes('entregue');
      }

      const result = await supabase
        .from('envios_processados')
        .update(updateData)
        .eq('sales_order', salesOrder)
        .select();

      data = result.data;
      error = result.error;

    } else {
      // INSERT new record with all data
      console.log('➕ Criando nova SO:', salesOrder);
      
      const result = await supabase
        .from('envios_processados')
        .insert({
          sales_order: salesOrder,
          erp_order: payload.erp_order || null,
          web_order: payload.web_order || null,
          cliente: payload.cliente || 'Cliente não especificado',
          produtos: payload.produtos || 'Produtos não especificados',
          valor_total: payload.valor_total || 0,
          tracking_numbers: payload.tracking_numbers ? sanitizeInput(payload.tracking_numbers, 500) : null,
          data_envio: payload.data_envio,
          status: translateFedExStatus(payload.status || 'Em Trânsito'),
          status_atual: translateFedExStatus(payload.status_atual || 'Em Trânsito'),
          status_cliente: translateFedExStatus(payload.status_cliente || payload.status_atual || 'Em Trânsito'),
          ultima_localizacao: translateFedExStatus(payload.ultima_localizacao || 'Em Trânsito'),
          carrier: payload.carrier || 'FedEx',
          ship_to: payload.ship_to || null,
          data_ultima_atualizacao: new Date().toISOString()
        })
        .select();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('❌ Erro ao processar envio:', {
        sales_order: salesOrder,
        operacao: existing ? 'UPDATE' : 'INSERT',
        error: error.message,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Envio processado:', salesOrder, existing ? '(atualizado)' : '(criado)');

    // INSERT no histórico
    if (payload.tracking_numbers) {
      await supabase
        .from('shipment_history')
        .insert({
          sales_order: salesOrder,
          status: 'Atualizado',
          location: payload.ultima_localizacao,
          tracking_number: sanitizeInput(payload.tracking_numbers, 500),
          description: JSON.stringify({
            carrier: payload.carrier,
            fonte: 'Update via n8n'
          }),
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      
      console.log('📝 Histórico atualizado');
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});