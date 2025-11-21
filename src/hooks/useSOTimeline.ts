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

        // 6. Determinar estágio atual
        const currentStage = mapStatusToStage(so.statusAtual);
        const currentStageOrder = currentStage.order;

        // 7. Construir timeline com todos os estágios
        const timelineEvents: TimelineEvent[] = ALL_STAGES.map((stage, index) => {
          const completedInfo = completedStagesMap.get(stage.id);
          
          let status: 'completed' | 'current' | 'upcoming';
          let data: string;
          let detalhes: string | undefined;

          if (stage.order < currentStageOrder) {
            // Estágio passado
            status = 'completed';
            data = completedInfo?.date.toISOString() || 
                   new Date(Date.now() - (currentStageOrder - stage.order) * 3 * 24 * 60 * 60 * 1000).toISOString();
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
            
            // Usar a data do estágio atual como referência
            const currentStageDate = new Date(
              completedStagesMap.get(currentStage.id)?.date || 
              so.dataUltimaAtualizacao || 
              so.dataOrdem || 
              new Date()
            );
            
            // Se o estágio futuro for Entregue e o atual for Desembaraço, usar 2 dias úteis
            let daysAhead: number;
            if (stage.id === 'entregue' && currentStage.id === 'desembaraco') {
              daysAhead = 2;
            } else {
              daysAhead = (stage.order - currentStageOrder) * 4;
            }
            
            // Usar addBusinessDays a partir da data do estágio atual
            data = addBusinessDays(currentStageDate, daysAhead).toISOString();
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
        const fallbackEvents = ALL_STAGES.map((stage, index) => ({
          id: `${stage.id}_${index}`,
          tipo: stage.id,
          titulo: stage.title,
          data: stage.order <= currentStage.order 
            ? new Date(Date.now() - (currentStage.order - stage.order) * 3 * 24 * 60 * 60 * 1000).toISOString()
            : addBusinessDays(new Date(), (stage.order - currentStage.order) * 4).toISOString(),
          status: (stage.order < currentStage.order ? 'completed' : 
                   stage.order === currentStage.order ? 'current' : 'upcoming') as 'completed' | 'current' | 'upcoming'
        }));
        
        setEvents(fallbackEvents);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [so.salesOrder, so.statusAtual, so.dataUltimaAtualizacao, so.dataOrdem]);

  return { events, loading };
};
