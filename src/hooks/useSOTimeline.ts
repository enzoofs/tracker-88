import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Previsão de entrega: 15 dias corridos após saída da fábrica
const DELIVERY_FORECAST_DAYS = 15;

// Função para adicionar dias corridos a uma data
const addCalendarDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
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
  dataEnvio?: string;   // Data de envio FedEx
  createdAt?: string;   // Data de criação no sistema
}

export const useSOTimeline = (so: SO) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Mapeamento de status para estágios da timeline
  const mapStatusToStage = (status: string): { id: string; title: string; order: number } => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('produção') || statusLower.includes('producao')) {
      return { id: 'em_producao', title: 'Em Produção', order: 0 };
    }
    if (statusLower.includes('enviado') || statusLower.includes('fedex')) {
      return { id: 'fedex', title: 'FedEx', order: 1 };
    }
    if (statusLower.includes('armazém') || statusLower.includes('armazem')) {
      return { id: 'no_armazem', title: 'No Armazém', order: 2 };
    }
    if (statusLower.includes('aguardando embarque')) {
      return { id: 'embarque_agendado', title: 'Embarque Agendado', order: 3 };
    }
    if (statusLower.includes('embarcado') || statusLower.includes('embarque confirmado')) {
      return { id: 'embarque_confirmado', title: 'Embarque Confirmado', order: 4 };
    }
    if (statusLower.includes('trânsito') || statusLower.includes('transito') || statusLower.includes('voo')) {
      return { id: 'chegada_brasil', title: 'Chegada no Brasil', order: 5 };
    }
    if (statusLower.includes('desembaraço') || statusLower.includes('desembaraco')) {
      return { id: 'desembaraco', title: 'Desembaraço', order: 6 };
    }
    if (statusLower.includes('entregue') || statusLower.includes('destino')) {
      return { id: 'entregue', title: 'Entregue', order: 7 };
    }
    
    return { id: 'em_producao', title: status, order: 0 };
  };

  // Todos os estágios possíveis na ordem
  const ALL_STAGES = [
    { id: 'em_producao', title: 'Em Produção', order: 0 },
    { id: 'fedex', title: 'FedEx', order: 1 },
    { id: 'no_armazem', title: 'No Armazém', order: 2 },
    { id: 'embarque_agendado', title: 'Embarque Agendado', order: 3 },
    { id: 'embarque_confirmado', title: 'Embarque Confirmado', order: 4 },
    { id: 'chegada_brasil', title: 'Chegada no Brasil', order: 5 },
    { id: 'desembaraco', title: 'Desembaraço', order: 6 },
    { id: 'entregue', title: 'Entregue', order: 7 }
  ];

  // Garantir progressividade das datas na timeline
  const ensureProgressiveDates = (timeline: TimelineEvent[]): TimelineEvent[] => {
    const result = [...timeline];
    
    for (let i = 1; i < result.length; i++) {
      const prevDate = new Date(result[i - 1].data);
      const currDate = new Date(result[i].data);
      
      // Se a data atual for anterior ou igual à anterior, ajustar
      if (currDate <= prevDate) {
        // Adicionar 1 hora após o estágio anterior
        const adjustedDate = new Date(prevDate.getTime() + 60 * 60 * 1000);
        result[i] = {
          ...result[i],
          data: adjustedDate.toISOString()
        };
      }
    }
    
    return result;
  };

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

        // 6. Usar dados reais confiáveis para estágios específicos
        // Em Produção: usar createdAt (quando SO entrou no sistema)
        if (so.createdAt) {
          const createdDate = new Date(so.createdAt);
          if (!completedStagesMap.has('em_producao') || 
              completedStagesMap.get('em_producao')!.date > createdDate) {
            completedStagesMap.set('em_producao', {
              date: createdDate,
              details: 'Entrada no sistema'
            });
          }
        }

        // FedEx: usar dataEnvio (quando saiu da fábrica)
        if (so.dataEnvio) {
          const envioDate = new Date(so.dataEnvio);
          if (!completedStagesMap.has('fedex') || 
              completedStagesMap.get('fedex')!.date > envioDate) {
            completedStagesMap.set('fedex', {
              date: envioDate,
              details: 'Enviado via FedEx'
            });
          }
        }

        // 7. Determinar estágio atual
        const currentStage = mapStatusToStage(so.statusAtual);
        const currentStageOrder = currentStage.order;

        // 8. Construir timeline com todos os estágios
        const timelineEvents: TimelineEvent[] = ALL_STAGES.map((stage, index) => {
          const completedInfo = completedStagesMap.get(stage.id);
          
          let status: 'completed' | 'current' | 'upcoming';
          let data: string;
          let detalhes: string | undefined;

          if (stage.order < currentStageOrder) {
            // Estágio passado - usar dados reais quando disponíveis
            status = 'completed';
            
            if (completedInfo?.date) {
              data = completedInfo.date.toISOString();
            } else if (stage.id === 'em_producao' && so.createdAt) {
              data = so.createdAt;
            } else if (stage.id === 'fedex' && so.dataEnvio) {
              data = so.dataEnvio;
            } else {
              // Fallback: calcular baseado no estágio atual
              const currentDate = new Date(so.dataUltimaAtualizacao || so.dataOrdem || Date.now());
              const daysBack = (currentStageOrder - stage.order) * 3;
              data = new Date(currentDate.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();
            }
            
            detalhes = completedInfo?.details;
          } else if (stage.order === currentStageOrder) {
            // Estágio atual
            status = 'current';
            data = completedInfo?.date.toISOString() || 
                   so.dataUltimaAtualizacao || 
                   so.dataOrdem || 
                   new Date().toISOString();
            detalhes = completedInfo?.details;
          } else {
            // Estágio futuro
            status = 'upcoming';
            
            // Se temos dataEnvio, calcular previsão baseada em 15 dias corridos
            if (so.dataEnvio) {
              const envioDate = new Date(so.dataEnvio);
              const deliveryDate = addCalendarDays(envioDate, DELIVERY_FORECAST_DAYS);
              
              // Calcular dias proporcionais para cada estágio futuro
              const stagesRemaining = 7 - currentStageOrder; // Até entrega
              const daysPerStage = DELIVERY_FORECAST_DAYS / stagesRemaining;
              const daysAhead = Math.round((stage.order - currentStageOrder) * daysPerStage);
              
              const currentStageDate = new Date(
                completedStagesMap.get(currentStage.id)?.date || 
                so.dataUltimaAtualizacao || 
                so.dataOrdem || 
                new Date()
              );
              
              data = addCalendarDays(currentStageDate, daysAhead).toISOString();
            } else {
              // Fallback: usar cálculo proporcional
              const currentStageDate = new Date(
                completedStagesMap.get(currentStage.id)?.date || 
                so.dataUltimaAtualizacao || 
                so.dataOrdem || 
                new Date()
              );
              
              const daysAhead = (stage.order - currentStageOrder) * 3;
              data = addCalendarDays(currentStageDate, daysAhead).toISOString();
            }
          }

          return {
            id: `${stage.id}_${index}`,
            tipo: stage.id,
            titulo: stage.title,
            data: data,
            status: status,
            detalhes: detalhes
          };
        });

        // 9. Garantir progressividade das datas
        const progressiveTimeline = ensureProgressiveDates(timelineEvents);

        console.log('✅ Timeline construída:', {
          total: progressiveTimeline.length,
          completed: progressiveTimeline.filter(e => e.status === 'completed').length,
          current: progressiveTimeline.filter(e => e.status === 'current').length,
          upcoming: progressiveTimeline.filter(e => e.status === 'upcoming').length
        });

        setEvents(progressiveTimeline);
      } catch (error) {
        console.error('Erro ao buscar timeline:', error);
        
        // Fallback: criar timeline básica com progressividade garantida
        const currentStage = mapStatusToStage(so.statusAtual);
        
        // Usar createdAt como base para estágios passados
        const baseDate = new Date(so.createdAt || so.dataOrdem || Date.now());
        
        const fallbackEvents = ALL_STAGES.map((stage, index) => {
          let data: string;
          
          if (stage.order < currentStage.order) {
            // Estágios passados: calcular progressivamente a partir de createdAt
            if (stage.id === 'em_producao' && so.createdAt) {
              data = so.createdAt;
            } else if (stage.id === 'fedex' && so.dataEnvio) {
              data = so.dataEnvio;
            } else {
              data = addCalendarDays(baseDate, stage.order * 2).toISOString();
            }
          } else if (stage.order === currentStage.order) {
            data = so.dataUltimaAtualizacao || so.dataOrdem || new Date().toISOString();
          } else {
            // Estágios futuros: calcular a partir do estágio atual usando 15 dias corridos
            const currentDate = new Date(so.dataUltimaAtualizacao || so.dataOrdem || Date.now());
            data = addCalendarDays(currentDate, (stage.order - currentStage.order) * 3).toISOString();
          }
          
          return {
            id: `${stage.id}_${index}`,
            tipo: stage.id,
            titulo: stage.title,
            data: data,
            status: (stage.order < currentStage.order ? 'completed' : 
                     stage.order === currentStage.order ? 'current' : 'upcoming') as 'completed' | 'current' | 'upcoming'
          };
        });
        
        // Garantir progressividade mesmo no fallback
        setEvents(ensureProgressiveDates(fallbackEvents));
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [so.salesOrder, so.statusAtual, so.dataUltimaAtualizacao, so.dataOrdem, so.dataEnvio, so.createdAt]);

  return { events, loading };
};
