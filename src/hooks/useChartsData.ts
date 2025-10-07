import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  pedidosPorCliente: Array<{ cliente: string; pedidos: number; }>;
  statusDistribution: Array<{ status: string; quantidade: number; }>;
}

export const useChartsData = () => {
  const [data, setData] = useState<ChartData>({
    pedidosPorCliente: [],
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
      const clienteCount = new Map<string, number>();
      const statusCount = new Map<string, number>();

      enviosData?.forEach(envio => {
        // Count by cliente
        const cliente = envio.cliente;
        clienteCount.set(cliente, (clienteCount.get(cliente) || 0) + 1);

        // Count by status
        const status = envio.status_atual || 'Não informado';
        statusCount.set(status, (statusCount.get(status) || 0) + 1);
      });

      // Convert to chart format and sort
      const pedidosPorCliente = Array.from(clienteCount.entries())
        .map(([cliente, pedidos]) => ({ cliente, pedidos }))
        .filter(item => item.pedidos > 0)
        .sort((a, b) => b.pedidos - a.pedidos)
        .slice(0, 10);

      const statusDistribution = Array.from(statusCount.entries())
        .map(([status, quantidade]) => ({ status, quantidade }))
        .filter(item => item.quantidade > 0 && item.status !== 'Não informado')
        .sort((a, b) => b.quantidade - a.quantidade);

      setData({
        pedidosPorCliente,
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