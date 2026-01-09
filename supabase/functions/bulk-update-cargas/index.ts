import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CargoUpdate {
  numero_carga: string;
  data_armazem?: string | null;
  data_embarque?: string | null;
  data_chegada?: string | null;
  data_desembaraco?: string | null;
  data_entrega?: string | null;
  status?: string | null;
}

interface UpdateResult {
  success: boolean;
  numero_carga: string;
  message: string;
  sos_updated: number;
}

// Status/Location mapping based on dates
function inferStatusFromDates(update: CargoUpdate): { status: string; ultima_localizacao: string } {
  if (update.data_entrega) {
    return { status: 'Entregue', ultima_localizacao: 'Destino Final' };
  }
  if (update.data_desembaraco) {
    return { status: 'Liberado', ultima_localizacao: 'Brasil - Liberado' };
  }
  if (update.data_chegada) {
    return { status: 'Em Desembaraço', ultima_localizacao: 'Alfândega Brasil' };
  }
  if (update.data_embarque) {
    return { status: 'Em Trânsito', ultima_localizacao: 'Em Voo' };
  }
  if (update.data_armazem) {
    return { status: 'No Armazém', ultima_localizacao: 'Miami - Armazém FedEx' };
  }
  return { status: 'Em Consolidação', ultima_localizacao: 'Fornecedor' };
}

// Get event name for history
function getEventName(dateType: string): string {
  switch (dateType) {
    case 'data_armazem': return 'Chegada no Armazém';
    case 'data_embarque': return 'Embarque Confirmado';
    case 'data_chegada': return 'Chegada no Brasil';
    case 'data_desembaraco': return 'Desembaraço Concluído';
    case 'data_entrega': return 'Entrega Realizada';
    default: return 'Atualização';
  }
}

// Get location for event
function getEventLocation(dateType: string): string {
  switch (dateType) {
    case 'data_armazem': return 'Miami - Armazém FedEx';
    case 'data_embarque': return 'Aeroporto de Origem';
    case 'data_chegada': return 'Aeroporto Brasil';
    case 'data_desembaraco': return 'Alfândega Brasil';
    case 'data_entrega': return 'Destino Final';
    default: return 'N/A';
  }
}

// Get shipment history status
function getShipmentStatus(dateType: string): string {
  switch (dateType) {
    case 'data_armazem': return 'No Armazém';
    case 'data_embarque': return 'Em Trânsito';
    case 'data_chegada': return 'Em Desembaraço';
    case 'data_desembaraco': return 'Liberado';
    case 'data_entrega': return 'Entregue';
    default: return 'Atualização';
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cargas } = await req.json() as { cargas: CargoUpdate[] };

    if (!cargas || !Array.isArray(cargas) || cargas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Array de cargas é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Processando ${cargas.length} cargas...`);

    const results: UpdateResult[] = [];

    for (const carga of cargas) {
      const numeroCarga = String(carga.numero_carga).trim();
      
      if (!numeroCarga) {
        results.push({
          success: false,
          numero_carga: numeroCarga,
          message: 'numero_carga é obrigatório',
          sos_updated: 0,
        });
        continue;
      }

      try {
        // 1. Check if cargo exists
        const { data: existingCarga, error: fetchError } = await supabase
          .from('cargas')
          .select('*')
          .eq('numero_carga', numeroCarga)
          .single();

        if (fetchError || !existingCarga) {
          results.push({
            success: false,
            numero_carga: numeroCarga,
            message: `Carga ${numeroCarga} não encontrada`,
            sos_updated: 0,
          });
          continue;
        }

        // 2. Prepare update data - only update fields that are provided
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        // Track which dates are being updated for history
        const updatedDates: { type: string; date: string }[] = [];

        if (carga.data_armazem !== undefined && carga.data_armazem !== null) {
          updateData.data_armazem = carga.data_armazem;
          updatedDates.push({ type: 'data_armazem', date: carga.data_armazem });
        }

        if (carga.data_embarque !== undefined && carga.data_embarque !== null) {
          updateData.data_embarque = carga.data_embarque;
          updatedDates.push({ type: 'data_embarque', date: carga.data_embarque });
        }

        if (carga.data_chegada !== undefined && carga.data_chegada !== null) {
          updateData.data_chegada_prevista = carga.data_chegada;
          updatedDates.push({ type: 'data_chegada', date: carga.data_chegada });
        }

        if (carga.data_desembaraco !== undefined && carga.data_desembaraco !== null) {
          updateData.data_autorizacao = carga.data_desembaraco;
          updatedDates.push({ type: 'data_desembaraco', date: carga.data_desembaraco });
        }

        if (carga.data_entrega !== undefined && carga.data_entrega !== null) {
          updateData.data_entrega = carga.data_entrega;
          updatedDates.push({ type: 'data_entrega', date: carga.data_entrega });
        }

        // Infer status from dates if not explicitly provided
        const { status, ultima_localizacao } = carga.status 
          ? { status: carga.status, ultima_localizacao: inferStatusFromDates(carga).ultima_localizacao }
          : inferStatusFromDates(carga);
        
        updateData.status = status;
        updateData.ultima_localizacao = ultima_localizacao;

        console.log(`🔄 Atualizando carga ${numeroCarga}:`, updateData);

        // 3. Update cargas table
        const { error: updateError } = await supabase
          .from('cargas')
          .update(updateData)
          .eq('numero_carga', numeroCarga);

        if (updateError) {
          throw new Error(`Erro ao atualizar carga: ${updateError.message}`);
        }

        // 4. Insert events into carga_historico for each date
        for (const { type, date } of updatedDates) {
          // Check if event already exists for this date type
          const eventName = getEventName(type);
          
          // Delete existing event of same type (to replace with new date)
          await supabase
            .from('carga_historico')
            .delete()
            .eq('numero_carga', numeroCarga)
            .eq('evento', eventName);

          // Insert new event
          const { error: histError } = await supabase
            .from('carga_historico')
            .insert({
              numero_carga: numeroCarga,
              evento: eventName,
              data_evento: date,
              localizacao: getEventLocation(type),
              descricao: `Atualizado via importação em massa`,
            });

          if (histError) {
            console.error(`⚠️ Erro ao inserir histórico para ${numeroCarga}:`, histError);
          }
        }

        // 5. Get linked SOs
        const { data: linkedSOs, error: soError } = await supabase
          .from('carga_sales_orders')
          .select('so_number')
          .eq('numero_carga', numeroCarga);

        if (soError) {
          console.error(`⚠️ Erro ao buscar SOs vinculadas:`, soError);
        }

        const soNumbers = linkedSOs?.map(s => s.so_number) || [];
        let sosUpdated = 0;

        if (soNumbers.length > 0) {
          // 6. Update envios_processados for linked SOs
          const envioUpdate: Record<string, any> = {
            status_atual: status,
            status: status,
            status_cliente: status,
            ultima_localizacao: ultima_localizacao,
            data_ultima_atualizacao: new Date().toISOString(),
          };

          if (status === 'Entregue') {
            envioUpdate.is_delivered = true;
          }

          if (carga.data_embarque) {
            envioUpdate.data_envio = carga.data_embarque;
          }

          const { error: envioError, count } = await supabase
            .from('envios_processados')
            .update(envioUpdate)
            .in('sales_order', soNumbers);

          if (envioError) {
            console.error(`⚠️ Erro ao atualizar envios:`, envioError);
          } else {
            sosUpdated = soNumbers.length;
          }

          // 7. Insert shipment_history for each SO and each date
          for (const soNumber of soNumbers) {
            for (const { type, date } of updatedDates) {
              const shipmentStatus = getShipmentStatus(type);
              
              // Delete existing event of same status for this SO
              await supabase
                .from('shipment_history')
                .delete()
                .eq('sales_order', soNumber)
                .eq('status', shipmentStatus);

              // Insert new event
              const { error: shipHistError } = await supabase
                .from('shipment_history')
                .insert({
                  sales_order: soNumber,
                  status: shipmentStatus,
                  location: getEventLocation(type),
                  timestamp: date,
                  description: `Importação em massa - Carga ${numeroCarga}`,
                });

              if (shipHistError) {
                console.error(`⚠️ Erro ao inserir shipment_history para ${soNumber}:`, shipHistError);
              }
            }
          }
        }

        results.push({
          success: true,
          numero_carga: numeroCarga,
          message: `Atualizado com sucesso`,
          sos_updated: sosUpdated,
        });

        console.log(`✅ Carga ${numeroCarga} processada: ${sosUpdated} SOs atualizadas`);

      } catch (error: any) {
        console.error(`❌ Erro ao processar carga ${numeroCarga}:`, error);
        results.push({
          success: false,
          numero_carga: numeroCarga,
          message: error.message || 'Erro desconhecido',
          sos_updated: 0,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalSOs = results.reduce((sum, r) => sum + r.sos_updated, 0);

    console.log(`📊 Processamento concluído: ${successCount}/${results.length} cargas, ${totalSOs} SOs`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        total_sos_updated: totalSOs,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
