import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StageTime {
  stage: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
  count: number;
  sla: number;
  status: 'ok' | 'warning' | 'critical';
  slaVariance: number; // % acima/abaixo do SLA
}

interface StageTimingData {
  stages: StageTime[];
  totalAverageDays: number;
  totalSLA: number;
}

// Foco nos 3 gargalos críticos do processo
const STAGE_ORDER = [
  'Em Produção',
  'No Armazém',
  'Desembaraço'
];

// SLAs esperados por etapa (em dias) - apenas os gargalos críticos
const STAGE_SLAS: Record<string, number> = {
  'Em Produção': 7,    // 7 dias para produzir
  'No Armazém': 3,     // 3 dias no armazém
  'Desembaraço': 5     // 5 dias para desembaraçar
};

export const useStageTimingData = () => {
  const [data, setData] = useState<StageTimingData>({
    stages: [],
    totalAverageDays: 0,
    totalSLA: 0
  });
  const [loading, setLoading] = useState(true);

  const loadStageTimingData = async () => {
    try {
      setLoading(true);

      // Load shipment history to calculate stage transitions
      const { data: historyData, error: historyError } = await supabase
        .from('shipment_history')
        .select('*')
        .order('timestamp', { ascending: true });

      if (historyError) throw historyError;

      // Group by sales_order to track stage transitions
      const soMap = new Map<string, Array<{ status: string; timestamp: Date }>>();
      
      historyData?.forEach(record => {
        // Ignorar status "Atualizado" - são apenas updates de localização
        if (record.status === 'Atualizado') return;
        
        if (!soMap.has(record.sales_order)) {
          soMap.set(record.sales_order, []);
        }
        soMap.get(record.sales_order)!.push({
          status: record.status,
          timestamp: new Date(record.timestamp)
        });
      });

      // Load current orders to include orders still in stages
      const { data: currentOrders, error: ordersError } = await supabase
        .from('envios_processados')
        .select('sales_order, status_atual, data_ordem, data_envio, created_at, data_ultima_atualizacao');

      if (ordersError) throw ordersError;

      // Calculate time spent in each stage
      const stageTimes = new Map<string, number[]>();
      
      soMap.forEach((history, salesOrder) => {
        // Sort by timestamp
        history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Find entry and exit points for each stage in STAGE_ORDER
        STAGE_ORDER.forEach(stage => {
          // Find when order entered this stage (first occurrence)
          const entryIndex = history.findIndex(h => h.status === stage);
          if (entryIndex === -1) return; // Never entered this stage
          
          const entryTime = history[entryIndex].timestamp.getTime();
          
          // Find when order exited this stage (next different status in STAGE_ORDER)
          let exitTime: number | null = null;
          
          for (let i = entryIndex + 1; i < history.length; i++) {
            const nextStatus = history[i].status;
            // Exit when we find a different stage from STAGE_ORDER
            if (STAGE_ORDER.includes(nextStatus) && nextStatus !== stage) {
              exitTime = history[i].timestamp.getTime();
              break;
            }
          }
          
          // If no exit found, check if order is still in this stage
          if (exitTime === null) {
            const currentOrder = currentOrders?.find(o => o.sales_order === salesOrder);
            if (currentOrder?.status_atual === stage) {
              // Order is still in this stage, use now() as exit time
              exitTime = Date.now();
            } else {
              // Order has moved on but we don't have the transition recorded
              // Skip this stage as we can't calculate accurate time
              return;
            }
          }
          
          const daysInStage = (exitTime - entryTime) / (1000 * 60 * 60 * 24);
          
          // Validar dados antes de registrar (filtrar valores absurdos)
          if (daysInStage > 0 && daysInStage < 90) {
            if (!stageTimes.has(stage)) {
              stageTimes.set(stage, []);
            }
            stageTimes.get(stage)!.push(daysInStage);
          }
        });
      });

      // Remover cálculo para SOs sem histórico válido - dados imprecisos

      // Log para debug
      console.log('Stage Timing Debug:', {
        totalSOs: currentOrders?.length,
        sosComHistorico: soMap.size,
        sosSemHistorico: (currentOrders?.length || 0) - soMap.size,
        stageTimes: Array.from(stageTimes.entries()).map(([stage, times]) => ({
          stage,
          count: times.length,
          avg: (times.reduce((a,b) => a+b, 0) / times.length).toFixed(1)
        }))
      });

      // Calculate statistics for each stage with SLA comparison
      const stages: StageTime[] = STAGE_ORDER
        .filter(stage => stageTimes.has(stage))
        .map(stage => {
          const times = stageTimes.get(stage)!;
          const avgDays = times.reduce((sum, t) => sum + t, 0) / times.length;
          const minDays = Math.min(...times);
          const maxDays = Math.max(...times);
          const sla = STAGE_SLAS[stage] || 0;
          const slaVariance = sla > 0 ? ((avgDays - sla) / sla) * 100 : 0;
          
          // Classify status based on SLA
          let status: 'ok' | 'warning' | 'critical' = 'ok';
          if (avgDays > sla * 1.3) {
            status = 'critical';
          } else if (avgDays > sla) {
            status = 'warning';
          }
          
          return {
            stage,
            avgDays: Math.round(avgDays * 10) / 10,
            minDays: Math.round(minDays * 10) / 10,
            maxDays: Math.round(maxDays * 10) / 10,
            count: times.length,
            sla,
            status,
            slaVariance: Math.round(slaVariance)
          };
        });

      // Calculate total average days and SLA for all critical bottlenecks
      const totalAverageDays = stages
        .reduce((sum, stage) => sum + stage.avgDays, 0);
      const totalSLA = STAGE_ORDER.reduce((sum, stage) => sum + (STAGE_SLAS[stage] || 0), 0);

      setData({
        stages,
        totalAverageDays: Math.round(totalAverageDays * 10) / 10,
        totalSLA
      });

    } catch (error) {
      console.error('Error loading stage timing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStageTimingData();
  }, []);

  return { data, loading, refresh: loadStageTimingData };
};
