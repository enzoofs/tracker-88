import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Função para adicionar dias úteis a uma data
const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // 0 = Domingo, 6 = Sábado
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

interface TimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  data: string;
  dataPrevista?: string;
  status: 'completed' | 'current' | 'upcoming';
  detalhes?: string;
}

interface SO {
  salesOrder: string;
  statusAtual: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  dataEnvio?: string;
}

export const useSOTimeline = (so: SO) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Mapeamento de status para estágios da timeline - FLUXO SIMPLIFICADO
  const mapStatusToStage = (status: string): { id: string; title: string; order: number } => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('produção') || statusLower.includes('producao')) {
      return { id: 'em_producao', title: 'Em Produção', order: 0 };
    }
    if (statusLower.includes('enviado') || statusLower.includes('fedex') || 
        statusLower.includes('picked up') || statusLower.includes('shipment information')) {
      return { id: 'fedex', title: 'FedEx', order: 1 };
    }
    if (statusLower.includes('armazém') || statusLower.includes('armazem') || statusLower.includes('miami')) {
      return { id: 'no_armazem', title: 'No Armazém', order: 2 };
    }
    if (statusLower.includes('trânsito') || statusLower.includes('transito') || 
        statusLower.includes('embarc') || statusLower.includes('voo')) {
      return { id: 'em_transito', title: 'Em Trânsito', order: 3 };
    }
    if (statusLower.includes('desembaraço') || statusLower.includes('desembaraco') || 
        statusLower.includes('alfândega') || statusLower.includes('alfandega') ||
        statusLower.includes('liberação') || statusLower.includes('liberacao')) {
      return { id: 'desembaraco', title: 'Desembaraço', order: 4 };
    }
    if (statusLower.includes('entregue') || statusLower.includes('delivered') || statusLower.includes('destino')) {
      return { id: 'entregue', title: 'Entregue', order: 5 };
    }
    
    return { id: 'em_producao', title: status, order: 0 };
  };

  // Estágios simplificados - apenas 6 estágios
  const ALL_STAGES = [
    { id: 'em_producao', title: 'Em Produção', order: 0 },
    { id: 'fedex', title: 'FedEx', order: 1 },
    { id: 'no_armazem', title: 'No Armazém', order: 2 },
    { id: 'em_transito', title: 'Em Trânsito', order: 3 },
    { id: 'desembaraco', title: 'Desembaraço', order: 4 },
    { id: 'entregue', title: 'Entregue', order: 5 }
  ];

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);

        // 1. Buscar histórico da SO
        const { data: shipmentHistory, error: shipError } = await supabase
          .from('shipment_history')
          .select('*')
          .eq('sales_order', so.salesOrder)
          .order('timestamp', { ascending: true });

        if (shipError) throw shipError;

        // 2. Buscar carga vinculada
        const { data: cargoLink, error: linkError } = await supabase
          .from('carga_sales_orders')
          .select('numero_carga')
          .eq('so_number', so.salesOrder)
          .maybeSingle();

        let cargoHistory: any[] = [];
        if (cargoLink && !linkError) {
          // 3. Buscar histórico da carga
          const { data: cargoHist, error: cargoError } = await supabase
            .from('carga_historico')
            .select('*')
            .eq('numero_carga', cargoLink.numero_carga)
            .order('data_evento', { ascending: true });

          if (cargoError) throw cargoError;
          cargoHistory = cargoHist || [];
        }

        // 4. Mesclar e processar eventos
        const allHistoryEvents = [
          ...(shipmentHistory || []).map(h => ({
            date: new Date(h.timestamp || h.created_at),
            status: h.status,
            location: h.location,
            description: h.description,
            type: 'so'
          })),
          ...cargoHistory.map(h => ({
            date: new Date(h.data_evento || h.created_at),
            status: h.evento,
            location: h.localizacao,
            description: h.descricao,
            type: 'carga'
          }))
        ].sort((a, b) => a.date.getTime() - b.date.getTime());

        console.log('📊 Eventos históricos encontrados:', allHistoryEvents.length);

        // 5. Identificar estágios completados do histórico
        const completedStagesMap = new Map<string, { date: Date; details?: string }>();
        
        allHistoryEvents.forEach(event => {
          const stage = mapStatusToStage(event.status);
          
          // Só adicionar se não existir ou se for mais recente
          if (!completedStagesMap.has(stage.id) || 
              (event.date > completedStagesMap.get(stage.id)!.date)) {
            completedStagesMap.set(stage.id, {
              date: event.date,
              details: event.description
            });
          }
        });

        // 6. Usar data_envio para o estágio FedEx se disponível
        if (so.dataEnvio && !completedStagesMap.has('fedex')) {
          completedStagesMap.set('fedex', {
            date: new Date(so.dataEnvio),
            details: 'Enviado via FedEx'
          });
        }

        // 7. Determinar estágio atual
        const currentStage = mapStatusToStage(so.statusAtual);
        const currentStageOrder = currentStage.order;

        // 8. Construir timeline com todos os estágios
        const timelineEvents: TimelineEvent[] = [];
        let previousDate: Date | null = null;

        ALL_STAGES.forEach((stage, index) => {
          const completedInfo = completedStagesMap.get(stage.id);
          
          let status: 'completed' | 'current' | 'upcoming';
          let eventDate: Date;
          let detalhes: string | undefined;

          if (stage.order < currentStageOrder) {
            // Estágio passado - COMPLETADO
            status = 'completed';
            
            if (completedInfo?.date) {
              eventDate = completedInfo.date;
            } else {
              // Estimar baseado no estágio anterior
              const baseDate = previousDate || new Date(so.dataOrdem || so.dataUltimaAtualizacao);
              eventDate = addBusinessDays(baseDate, 2);
            }
            
            detalhes = completedInfo?.details;
          } else if (stage.order === currentStageOrder) {
            // Estágio atual - CURRENT
            status = 'current';
            
            if (completedInfo?.date) {
              eventDate = completedInfo.date;
            } else {
              eventDate = new Date(so.dataUltimaAtualizacao || so.dataOrdem || new Date());
            }
            
            detalhes = completedInfo?.details;
          } else {
            // Estágio futuro - UPCOMING
            status = 'upcoming';
            
            // Calcular baseado no estágio anterior (previousDate)
            const baseDate = previousDate || new Date(so.dataUltimaAtualizacao || so.dataOrdem || new Date());
            
            // Dias úteis até cada estágio futuro
            let daysAhead: number;
            if (stage.id === 'entregue' && currentStage.id === 'desembaraco') {
              daysAhead = 2; // 2 dias úteis após desembaraço
            } else {
              daysAhead = 3; // 3 dias úteis para próximo estágio
            }
            
            eventDate = addBusinessDays(baseDate, daysAhead);
          }

          // GARANTIR ORDEM CRONOLÓGICA: data atual nunca pode ser anterior à anterior
          if (previousDate && eventDate < previousDate) {
            eventDate = new Date(previousDate.getTime() + 24 * 60 * 60 * 1000); // +1 dia
          }

          previousDate = eventDate;

          timelineEvents.push({
            id: `${stage.id}_${index}`,
            tipo: stage.id,
            titulo: stage.title,
            data: eventDate.toISOString(),
            status: status,
            detalhes: detalhes
          });
        });

        console.log('✅ Timeline construída:', {
          total: timelineEvents.length,
          completed: timelineEvents.filter(e => e.status === 'completed').length,
          current: timelineEvents.filter(e => e.status === 'current').length,
          upcoming: timelineEvents.filter(e => e.status === 'upcoming').length
        });

        setEvents(timelineEvents);
      } catch (error) {
        console.error('Erro ao buscar timeline:', error);
        
        // Fallback: criar timeline básica
        const currentStage = mapStatusToStage(so.statusAtual);
        let previousDate: Date | null = null;
        
        const fallbackEvents = ALL_STAGES.map((stage, index) => {
          let eventDate: Date;
          
          if (stage.order <= currentStage.order) {
            const baseDate = previousDate || new Date(so.dataOrdem || so.dataUltimaAtualizacao);
            eventDate = stage.order === 0 ? baseDate : addBusinessDays(baseDate, 2);
          } else {
            const baseDate = previousDate || new Date();
            eventDate = addBusinessDays(baseDate, 3);
          }
          
          // Garantir ordem cronológica
          if (previousDate && eventDate < previousDate) {
            eventDate = new Date(previousDate.getTime() + 24 * 60 * 60 * 1000);
          }
          
          previousDate = eventDate;
          
          return {
            id: `${stage.id}_${index}`,
            tipo: stage.id,
            titulo: stage.title,
            data: eventDate.toISOString(),
            status: (stage.order < currentStage.order ? 'completed' : 
                     stage.order === currentStage.order ? 'current' : 'upcoming') as 'completed' | 'current' | 'upcoming'
          };
        });
        
        setEvents(fallbackEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [so.salesOrder, so.statusAtual, so.dataUltimaAtualizacao, so.dataOrdem, so.dataEnvio]);

  return { events, loading };
};
