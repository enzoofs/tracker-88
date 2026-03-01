import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

// The 3 critical bottleneck stages derived from cargo date fields
const STAGE_ORDER = [
  'No Armazém (Miami)',
  'Em Trânsito',
  'Desembaraço Aduaneiro',
];

// Expected SLAs per stage (calendar days)
const STAGE_SLAS: Record<string, number> = {
  'No Armazém (Miami)': 3,
  'Em Trânsito': 3,
  'Desembaraço Aduaneiro': 5,
};

/** Returns the difference in calendar days between two ISO date strings.
 *  Returns null when either string is falsy. */
function daysBetween(earlier: string | null, later: string | null): number | null {
  if (!earlier || !later) return null;
  const diff = (Date.parse(later) - Date.parse(earlier)) / (1000 * 60 * 60 * 24);
  return diff;
}

export const useStageTimingData = () => {
  const { toast } = useToast();
  const [data, setData] = useState<StageTimingData>({
    stages: [],
    totalAverageDays: 0,
    totalSLA: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStageTimingData = async () => {
    try {
      setLoading(true);

      const { data: cargas, error } = await supabase
        .from('cargas')
        .select('id, numero_carga, created_at, data_embarque, data_armazem, data_entrega, status');

      if (error) throw error;

      // Accumulate day samples per stage
      const stageTimes: Record<string, number[]> = {
        'No Armazém (Miami)': [],
        'Em Trânsito': [],
        'Desembaraço Aduaneiro': [],
      };

      cargas?.forEach(carga => {
        // No Armazém (Miami): created_at → data_embarque
        const armazemDays = daysBetween(carga.created_at, carga.data_embarque);
        if (armazemDays !== null && armazemDays >= 0 && armazemDays <= 90) {
          stageTimes['No Armazém (Miami)'].push(armazemDays);
        }

        // Em Trânsito: data_embarque → data_armazem
        const transitoDays = daysBetween(carga.data_embarque, carga.data_armazem);
        if (transitoDays !== null && transitoDays >= 0 && transitoDays <= 90) {
          stageTimes['Em Trânsito'].push(transitoDays);
        }

        // Desembaraço Aduaneiro: data_armazem → data_entrega
        const desembaracoDays = daysBetween(carga.data_armazem, carga.data_entrega);
        if (desembaracoDays !== null && desembaracoDays >= 0 && desembaracoDays <= 90) {
          stageTimes['Desembaraço Aduaneiro'].push(desembaracoDays);
        }
      });

      // Debug log
      console.log('Stage Timing Debug (cargo dates):', {
        totalCargas: cargas?.length,
        stageSamples: Object.entries(stageTimes).map(([stage, times]) => ({
          stage,
          count: times.length,
          avg: times.length > 0
            ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)
            : 'n/a',
        })),
      });

      // Build StageTime objects for each stage that has at least one sample
      const stages: StageTime[] = STAGE_ORDER
        .filter(stage => stageTimes[stage].length > 0)
        .map(stage => {
          const times = stageTimes[stage];
          const avgDays = times.reduce((sum, t) => sum + t, 0) / times.length;
          const minDays = Math.min(...times);
          const maxDays = Math.max(...times);
          const sla = STAGE_SLAS[stage] || 0;
          const slaVariance = sla > 0 ? ((avgDays - sla) / sla) * 100 : 0;

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
            slaVariance: Math.round(slaVariance),
          };
        });

      const totalAverageDays = stages.reduce((sum, s) => sum + s.avgDays, 0);
      const totalSLA = STAGE_ORDER.reduce((sum, stage) => sum + (STAGE_SLAS[stage] || 0), 0);

      setData({
        stages,
        totalAverageDays: Math.round(totalAverageDays * 10) / 10,
        totalSLA,
      });
    } catch (error) {
      console.error('Error loading stage timing data:', error);
      toast({
        title: 'Erro ao carregar tempos por estágio',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStageTimingData();
  }, []);

  return { data, loading, refresh: loadStageTimingData };
};
