import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StageTime {
  stage: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
  count: number;
  isBottleneck: boolean;
}

interface StageTimingData {
  stages: StageTime[];
  totalAverageDays: number;
}

const STAGE_ORDER = [
  'Em Produção',
  'Enviado',
  'No Armazém',
  'Voo Internacional',
  'Desembaraço',
  'Entregue'
];

export const useStageTimingData = () => {
  const [data, setData] = useState<StageTimingData>({
    stages: [],
    totalAverageDays: 0
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

      // Calculate statistics for each stage
      const stages: StageTime[] = STAGE_ORDER
        .filter(stage => stageTimes.has(stage))
        .map(stage => {
          const times = stageTimes.get(stage)!;
          const avgDays = times.reduce((sum, t) => sum + t, 0) / times.length;
          const minDays = Math.min(...times);
          const maxDays = Math.max(...times);
          
          return {
            stage,
            avgDays: Math.round(avgDays * 10) / 10,
            minDays: Math.round(minDays * 10) / 10,
            maxDays: Math.round(maxDays * 10) / 10,
            count: times.length,
            isBottleneck: false
          };
        });

      // Identify bottlenecks (stages that take longer than average)
      if (stages.length > 0) {
        const overallAvg = stages.reduce((sum, s) => sum + s.avgDays, 0) / stages.length;
        stages.forEach(stage => {
          stage.isBottleneck = stage.avgDays > overallAvg * 1.2; // 20% above average
        });
      }

      const totalAverageDays = stages.reduce((sum, s) => sum + s.avgDays, 0);

      setData({
        stages,
        totalAverageDays: Math.round(totalAverageDays * 10) / 10
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
