import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReportData {
  summary: {
    totalPedidos: number;
    valorTotal: number;
    ticketMedio: number;
    statusUnicos: number;
  };
  clientes: Array<{
    cliente: string;
    totalPedidos: number;
    valorTotal: number;
    ticketMedio: number;
  }>;
  fornecedores: Array<{
    fornecedor: string;
    totalPedidos: number;
    tempoMedioEntrega: number;
  }>;
  representantes: Array<{
    representante: string;
    totalPedidos: number;
    valorTotal: number;
    clientesUnicos: number;
  }>;
  entregas: Array<{
    status: string;
    quantidade: number;
    percentual: number;
  }>;
  pedidosPorStatus: Array<{
    status: string;
    quantidade: number;
  }>;
  topClientesPorValor: Array<{
    cliente: string;
    valorTotal: number;
  }>;
}

export const useReportsData = (timeRange: string = '30d') => {
  const [data, setData] = useState<ReportData>({
    summary: { totalPedidos: 0, valorTotal: 0, ticketMedio: 0, statusUnicos: 0 },
    clientes: [],
    fornecedores: [],
    representantes: [],
    entregas: [],
    pedidosPorStatus: [],
    topClientesPorValor: []
  });
  const [loading, setLoading] = useState(true);

  const getDateFilter = () => {
    const now = new Date();
    const daysMap: Record<string, number> = {
      '30d': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      'all': 0
    };
    
    const days = daysMap[timeRange] || 30;
    if (days === 0) return null;
    
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return startDate.toISOString();
  };

  const loadReportsData = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('envios_processados')
        .select('*');

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: enviosData, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate summary
      const totalPedidos = enviosData?.length || 0;
      const valorTotal = enviosData?.reduce((sum, item) => sum + (Number(item.valor_total) || 0), 0) || 0;
      const ticketMedio = totalPedidos > 0 ? valorTotal / totalPedidos : 0;
      const statusUnicos = new Set(enviosData?.map(item => item.status_cliente)).size;

      // Process clients data
      const clienteMap = new Map<string, { pedidos: number; valor: number }>();
      enviosData?.forEach(envio => {
        const cliente = envio.cliente;
        const valor = Number(envio.valor_total) || 0;
        
        if (clienteMap.has(cliente)) {
          const existing = clienteMap.get(cliente)!;
          existing.pedidos += 1;
          existing.valor += valor;
        } else {
          clienteMap.set(cliente, { pedidos: 1, valor });
        }
      });

      const clientes = Array.from(clienteMap.entries())
        .map(([cliente, data]) => ({
          cliente,
          totalPedidos: data.pedidos,
          valorTotal: data.valor,
          ticketMedio: data.valor / data.pedidos
        }))
        .sort((a, b) => b.valorTotal - a.valorTotal);

      // Process fornecedores (simplified from produtos field)
      const fornecedorMap = new Map<string, number>();
      enviosData?.forEach(envio => {
        const produtosStr = typeof envio.produtos === 'string' ? envio.produtos : JSON.stringify(envio.produtos || '');
        const fornecedor = produtosStr.split(',')[0]?.trim() || 'Não informado';
        fornecedorMap.set(fornecedor, (fornecedorMap.get(fornecedor) || 0) + 1);
      });

      const fornecedores = Array.from(fornecedorMap.entries())
        .map(([fornecedor, totalPedidos]) => ({
          fornecedor,
          totalPedidos,
          tempoMedioEntrega: 20 + Math.random() * 15 // Mock data
        }))
        .filter(item => item.fornecedor !== 'Não informado')
        .sort((a, b) => b.totalPedidos - a.totalPedidos);

      // Process representantes (mock data since not in current schema)
      const representantes = [
        { representante: 'João Silva', totalPedidos: Math.floor(totalPedidos * 0.3), valorTotal: valorTotal * 0.3, clientesUnicos: Math.floor(clientes.length * 0.25) },
        { representante: 'Maria Santos', totalPedidos: Math.floor(totalPedidos * 0.25), valorTotal: valorTotal * 0.25, clientesUnicos: Math.floor(clientes.length * 0.2) },
        { representante: 'Pedro Oliveira', totalPedidos: Math.floor(totalPedidos * 0.2), valorTotal: valorTotal * 0.2, clientesUnicos: Math.floor(clientes.length * 0.15) }
      ].sort((a, b) => b.valorTotal - a.valorTotal);

      // Process entregas by status
      const statusMap = new Map<string, number>();
      enviosData?.forEach(envio => {
        const status = envio.status_cliente || 'Não informado';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const entregas = Array.from(statusMap.entries())
        .map(([status, quantidade]) => ({
          status,
          quantidade,
          percentual: (quantidade / totalPedidos) * 100
        }))
        .sort((a, b) => b.quantidade - a.quantidade);

      const pedidosPorStatus = entregas.map(({ status, quantidade }) => ({ status, quantidade }));
      const topClientesPorValor = clientes.slice(0, 10).map(({ cliente, valorTotal }) => ({ cliente, valorTotal }));

      setData({
        summary: { totalPedidos, valorTotal, ticketMedio, statusUnicos },
        clientes,
        fornecedores,
        representantes,
        entregas,
        pedidosPorStatus,
        topClientesPorValor
      });

    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [timeRange]);

  return { data, loading, refresh: loadReportsData };
};