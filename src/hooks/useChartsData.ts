import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  pedidosPorCliente: Array<{ cliente: string; pedidos: number; }>;
  pedidosPorFornecedor: Array<{ fornecedor: string; pedidos: number; }>;
}

export const useChartsData = () => {
  const [data, setData] = useState<ChartData>({
    pedidosPorCliente: [],
    pedidosPorFornecedor: []
  });
  const [loading, setLoading] = useState(true);

  const loadChartsData = async () => {
    try {
      setLoading(true);

      const { data: enviosData, error } = await supabase
        .from('envios_processados')
        .select('cliente, produtos')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data for charts
      const clienteCount = new Map<string, number>();
      const fornecedorCount = new Map<string, number>();

      enviosData?.forEach(envio => {
        // Count by cliente
        const cliente = envio.cliente;
        clienteCount.set(cliente, (clienteCount.get(cliente) || 0) + 1);

        // Extract fornecedor from produtos (simplified logic)
        const produtos = envio.produtos || '';
        const fornecedor = produtos.split(',')[0]?.trim() || 'Não informado';
        fornecedorCount.set(fornecedor, (fornecedorCount.get(fornecedor) || 0) + 1);
      });

      // Convert to chart format and sort
      const pedidosPorCliente = Array.from(clienteCount.entries())
        .map(([cliente, pedidos]) => ({ cliente, pedidos }))
        .filter(item => item.pedidos > 0)
        .sort((a, b) => b.pedidos - a.pedidos)
        .slice(0, 10);

      const pedidosPorFornecedor = Array.from(fornecedorCount.entries())
        .map(([fornecedor, pedidos]) => ({ fornecedor, pedidos }))
        .filter(item => item.pedidos > 0 && item.fornecedor !== 'Não informado')
        .sort((a, b) => b.pedidos - a.pedidos)
        .slice(0, 10);

      setData({
        pedidosPorCliente,
        pedidosPorFornecedor
      });

    } catch (error) {
      console.error('Error loading charts data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartsData();
    
    // Cache for 5 minutes
    const interval = setInterval(loadChartsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, refresh: loadChartsData };
};