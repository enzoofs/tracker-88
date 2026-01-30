import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateBusinessDays } from '@/lib/statusNormalizer';

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
  const { toast } = useToast();
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

      // Fetch real delivery dates from cargas.data_entrega via carga_sales_orders
      const deliveryDatesMap: Record<string, Date> = {};
      const { data: cargoSOLinks } = await supabase
        .from('carga_sales_orders')
        .select('so_number, numero_carga');

      if (cargoSOLinks && cargoSOLinks.length > 0) {
        const cargoNumbers = [...new Set(cargoSOLinks.map(l => l.numero_carga))];
        const { data: cargasDelivery } = await supabase
          .from('cargas')
          .select('numero_carga, data_entrega')
          .in('numero_carga', cargoNumbers)
          .not('data_entrega', 'is', null);

        const cargoDeliveryMap: Record<string, string> = {};
        cargasDelivery?.forEach(c => {
          if (c.data_entrega) cargoDeliveryMap[c.numero_carga] = c.data_entrega;
        });

        cargoSOLinks.forEach(link => {
          const dd = cargoDeliveryMap[link.numero_carga];
          if (dd) deliveryDatesMap[link.so_number] = new Date(dd);
        });
      }

      // Calculate real average delivery time: data_envio → cargas.data_entrega (dias úteis)
      const deliveredOrders = enviosData?.filter(e => e.is_delivered && e.data_envio && deliveryDatesMap[e.sales_order]) || [];
      const avgDeliveryTime = deliveredOrders.length > 0
        ? deliveredOrders.reduce((sum, envio) => {
            const shipDate = new Date(envio.data_envio!);
            const deliveryDate = deliveryDatesMap[envio.sales_order];
            return sum + calculateBusinessDays(shipDate, deliveryDate);
          }, 0) / deliveredOrders.length
        : 0;

      // Process fornecedores by carrier
      const fornecedorMap = new Map<string, { count: number; deliveryTimes: number[] }>();
      deliveredOrders.forEach(envio => {
        const fornecedor = envio.carrier || 'Não informado';
        if (!fornecedorMap.has(fornecedor)) {
          fornecedorMap.set(fornecedor, { count: 0, deliveryTimes: [] });
        }
        const shipDate = new Date(envio.data_envio!);
        const deliveryDate = deliveryDatesMap[envio.sales_order];
        const bizDays = calculateBusinessDays(shipDate, deliveryDate);
        fornecedorMap.get(fornecedor)!.count += 1;
        fornecedorMap.get(fornecedor)!.deliveryTimes.push(bizDays);
      });

      const fornecedores = Array.from(fornecedorMap.entries())
        .map(([fornecedor, data]) => ({
          fornecedor,
          totalPedidos: data.count,
          tempoMedioEntrega: data.deliveryTimes.reduce((a, b) => a + b, 0) / data.deliveryTimes.length
        }))
        .filter(item => item.fornecedor !== 'Não informado')
        .sort((a, b) => b.totalPedidos - a.totalPedidos);

      // Representatives removed - no data available in schema
      const representantes: Array<{
        representante: string;
        totalPedidos: number;
        valorTotal: number;
        clientesUnicos: number;
      }> = [];

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
      toast({ title: 'Erro ao carregar relatórios', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [timeRange]);

  return { data, loading, refresh: loadReportsData };
};