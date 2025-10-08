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

const STAGE_ORDER = [
  'Em Produção',
  'Enviado',
  'No Armazém',
  'Voo Internacional',
  'Desembaraço',
  'Entregue'
];

// SLAs esperados por etapa (em dias)
const STAGE_SLAS: Record<string, number> = {
  'Em Produção': 30,
  'Enviado': 1.5,
  'No Armazém': 3,
  'Voo Internacional': 2,
  'Desembaraço': 5,
  'Entregue': 1
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
        if (!soMap.has(record.sales_order)) {
          soMap.set(record.sales_order, []);
        }
        soMap.get(record.sales_order)!.push({
          status: record.status,
          timestamp: new Date(record.timestamp)
        });
      });

      // Calculate time spent in each stage
      const stageTimes = new Map<string, number[]>();
      
      soMap.forEach((history) => {
        // Sort by timestamp
        history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Calculate time between consecutive stages
        for (let i = 0; i < history.length - 1; i++) {
          const currentStage = history[i].status;
          const nextTime = history[i + 1].timestamp.getTime();
          const currentTime = history[i].timestamp.getTime();
          const daysInStage = (nextTime - currentTime) / (1000 * 60 * 60 * 24);
          
          if (!stageTimes.has(currentStage)) {
            stageTimes.set(currentStage, []);
          }
          stageTimes.get(currentStage)!.push(daysInStage);
        }
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

      const totalAverageDays = stages.reduce((sum, s) => sum + s.avgDays, 0);
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
