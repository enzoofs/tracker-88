import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  statusDistribution: Array<{ status: string; quantidade: number; }>;
}

export const useChartsData = () => {
  const [data, setData] = useState<ChartData>({
    statusDistribution: []
  });
  const [loading, setLoading] = useState(true);

  const loadChartsData = async () => {
    try {
      setLoading(true);

      const { data: enviosData, error } = await supabase
        .from('envios_processados')
        .select('cliente, status_atual')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data for charts
      const statusCount = new Map<string, number>();

      enviosData?.forEach(envio => {
        // Count by status
        const status = envio.status_atual || 'Não informado';
        statusCount.set(status, (statusCount.get(status) || 0) + 1);
      });

      // Convert to chart format and sort (exclude "Entregue")
      const statusDistribution = Array.from(statusCount.entries())
        .map(([status, quantidade]) => ({ status, quantidade }))
        .filter(item => 
          item.quantidade > 0 && 
          item.status !== 'Não informado' &&
          item.status.toLowerCase() !== 'entregue'
        )
        .sort((a, b) => b.quantidade - a.quantidade);

      setData({
        statusDistribution
      });

    } catch (error) {
      console.error('Error loading charts data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartsData();
    
    // Cache for 30 minutes
    const interval = setInterval(loadChartsData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, refresh: loadChartsData };
};