import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStatus, calculateBusinessDays, STAGE_SLAS, DELIVERY_SLA_DAYS } from '@/lib/statusNormalizer';

interface AnalyticsData {
  kpis: {
    receitaTotal: number;
    ticketMedio: number;
    taxaEntrega: number;
    previsaoProximoMes: number;
  };
  tendenciaReceita: Array<{
    mes: string;
    receita: number;
    crescimento: number;
  }>;
  crescimentoClientes: Array<{
    mes: string;
    novosClientes: number;
    totalClientes: number;
  }>;
  topPerformers: {
    clientes: Array<{ nome: string; valor: number; badge: 'ouro' | 'prata' | 'bronze' }>;
  };
  metricas: {
    entregasNoPrazo: number;
    pedidosAtrasados: number;
    eficienciaOperacional: number;
  };
  insights: {
    tendenciaCrescimento: { tipo: 'positiva' | 'negativa' | 'estavel'; percentual: number };
    previsaoProximoMes: { valor: number; confianca: number };
    atencaoNecessaria: string[];
  };
  variacoesResumo: Array<{
    mes: string;
    receita: number;
    variacao: number;
  }>;
  estatisticas: {
    maiorMes: { mes: string; valor: number };
    menorMes: { mes: string; valor: number };
    mediaMensal: number;
    totalPedidos: number;
  };
}

export const useAnalytics = (timeRange: string = '12m') => {
  const [data, setData] = useState<AnalyticsData>({
    kpis: { receitaTotal: 0, ticketMedio: 0, taxaEntrega: 0, previsaoProximoMes: 0 },
    tendenciaReceita: [],
    crescimentoClientes: [],
    topPerformers: { clientes: [] },
    metricas: { entregasNoPrazo: 0, pedidosAtrasados: 0, eficienciaOperacional: 0 },
    insights: { 
      tendenciaCrescimento: { tipo: 'estavel', percentual: 0 }, 
      previsaoProximoMes: { valor: 0, confianca: 0 }, 
      atencaoNecessaria: [] 
    },
    variacoesResumo: [],
    estatisticas: { maiorMes: { mes: '', valor: 0 }, menorMes: { mes: '', valor: 0 }, mediaMensal: 0, totalPedidos: 0 }
  });
  const [loading, setLoading] = useState(true);

  const parseDate = (dateStr: string | null): Date => {
    if (!dateStr) return new Date();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const { data: enviosData, error } = await supabase
        .from('envios_processados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate main KPIs
      const receitaTotal = enviosData?.reduce((sum, item) => sum + (Number(item.valor_total) || 0), 0) || 0;
      const ticketMedio = enviosData?.length ? receitaTotal / enviosData.length : 0;
      
      // Calculate real delivery rate based on SLA (15 calendar days, same as Overview)
      // Only count SOs that have both data_envio and delivery date
      const entregues = enviosData?.filter(e => e.is_delivered) || [];
      let onTimeCount = 0;
      let totalWithDates = 0;

      entregues.forEach(envio => {
        if (envio.data_envio) {
          totalWithDates++;
          const shipDate = parseDate(envio.data_envio);
          const deliveryDate = parseDate(envio.data_ultima_atualizacao);
          const calendarDays = Math.ceil((deliveryDate.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
          if (calendarDays <= DELIVERY_SLA_DAYS) {
            onTimeCount++;
          }
        }
        // Skip SOs without data_envio — don't assume on-time
      });

      const taxaEntrega = totalWithDates > 0 ? (onTimeCount / totalWithDates) * 100 : 0;
      
      // Generate monthly revenue trend (last 12 months)
      const monthlyData = new Map<string, { receita: number; pedidos: number; clientes: Set<string> }>();
      
      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        monthlyData.set(key, { receita: 0, pedidos: 0, clientes: new Set() });
      }

      // Process actual data
      enviosData?.forEach(envio => {
        const date = parseDate(envio.created_at);
        const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        
        if (monthlyData.has(key)) {
          const existing = monthlyData.get(key)!;
          existing.receita += Number(envio.valor_total) || 0;
          existing.pedidos += 1;
          existing.clientes.add(envio.cliente);
        }
      });

      // Convert to arrays for charts
      const tendenciaReceita = Array.from(monthlyData.entries()).map(([mes, data], index, array) => {
        const prevReceita = index > 0 ? array[index - 1][1].receita : data.receita;
        const crescimento = prevReceita > 0 ? ((data.receita - prevReceita) / prevReceita) * 100 : 0;
        return { mes, receita: data.receita, crescimento };
      });

      // Calculate GENUINELY new clients per month (first order ever)
      const allClientFirstOrders = new Map<string, string>();
      enviosData?.forEach(envio => {
        const cliente = envio.cliente;
        const orderDate = parseDate(envio.created_at);
        const existingDate = allClientFirstOrders.get(cliente);
        if (!existingDate || orderDate < parseDate(existingDate)) {
          allClientFirstOrders.set(cliente, envio.created_at || '');
        }
      });

      const novosClientesPorMes = new Map<string, number>();
      allClientFirstOrders.forEach((firstOrderDate) => {
        const date = parseDate(firstOrderDate);
        const mes = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        novosClientesPorMes.set(mes, (novosClientesPorMes.get(mes) || 0) + 1);
      });

      let runningTotal = 0;
      const crescimentoClientes = Array.from(monthlyData.entries()).map(([mes]) => {
        const novos = novosClientesPorMes.get(mes) || 0;
        runningTotal += novos;
        return {
          mes,
          novosClientes: novos,
          totalClientes: runningTotal
        };
      });

      // Calculate top performers (only clients, not "representantes")
      const clienteMap = new Map<string, number>();
      enviosData?.forEach(envio => {
        const cliente = envio.cliente;
        const valor = Number(envio.valor_total) || 0;
        clienteMap.set(cliente, (clienteMap.get(cliente) || 0) + valor);
      });

      const topClientes = Array.from(clienteMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([nome, valor], index) => ({
          nome,
          valor,
          badge: (index === 0 ? 'ouro' : index === 1 ? 'prata' : 'bronze') as 'ouro' | 'prata' | 'bronze'
        }));

      // Calculate metrics based on real SLA data
      const totalPedidos = enviosData?.length || 0;
      const entregasNoPrazo = Math.round(taxaEntrega);
      
      // Calculate delayed orders based on actual SLA compliance
      let pedidosAtrasados = 0;
      enviosData?.forEach(envio => {
        if (envio.is_delivered) return;
        
        const status = normalizeStatus(envio.status_atual);
        const sla = STAGE_SLAS[status];
        
        if (sla && sla > 0) {
          const startDate = parseDate(envio.data_ultima_atualizacao || envio.created_at);
          const daysInStage = calculateBusinessDays(startDate, new Date());
          
          // Consider delayed if exceeds SLA by 30%
          if (daysInStage > sla * 1.3) {
            pedidosAtrasados++;
          }
        }
      });

      const eficienciaOperacional = totalPedidos > 0 
        ? Math.round(((totalPedidos - pedidosAtrasados) / totalPedidos) * 100)
        : 0;

      // Calculate growth trends and forecast
      const mesAtual = tendenciaReceita[tendenciaReceita.length - 1];
      const mesAnterior = tendenciaReceita[tendenciaReceita.length - 2];

      // Check if current month is partial
      const hoje = new Date();
      const diasDecorridos = hoje.getDate();
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      
      let previsaoProximoMes = 0;
      let receitaParaComparacao = mesAtual?.receita || 0;
      
      if (diasDecorridos < diasNoMes && mesAtual?.receita > 0) {
        // Partial month - project full month
        const mediaDeariaMesAtual = mesAtual.receita / diasDecorridos;
        previsaoProximoMes = mediaDeariaMesAtual * diasNoMes;
        receitaParaComparacao = previsaoProximoMes;
      } else {
        // Full month - use moving average
        const recentMonths = tendenciaReceita.slice(-3).filter(m => m.receita > 0);
        if (recentMonths.length > 0) {
          const avgGrowth = recentMonths.reduce((sum, month) => sum + month.crescimento, 0) / recentMonths.length;
          previsaoProximoMes = (mesAtual?.receita || 0) * (1 + avgGrowth / 100);
        }
        receitaParaComparacao = mesAtual?.receita || 0;
      }

      // Calculate real growth using projection for partial months
      const crescimentoReal = mesAnterior?.receita > 0 
        ? ((receitaParaComparacao - mesAnterior.receita) / mesAnterior.receita) * 100 
        : 0;

      // Calculate confidence based on data variance (not random!)
      const receitasRecentes = tendenciaReceita.slice(-6).map(t => t.receita).filter(r => r > 0);
      let confianca = 75; // Base confidence
      
      if (receitasRecentes.length >= 3) {
        const media = receitasRecentes.reduce((a, b) => a + b, 0) / receitasRecentes.length;
        const variancia = receitasRecentes.reduce((sum, r) => sum + Math.pow(r - media, 2), 0) / receitasRecentes.length;
        const coefVariacao = Math.sqrt(variancia) / media;
        
        // Higher variance = lower confidence
        confianca = Math.max(50, Math.min(95, Math.round(95 - coefVariacao * 100)));
      }

      const insights = {
        tendenciaCrescimento: {
          tipo: (crescimentoReal > 5 ? 'positiva' : crescimentoReal < -5 ? 'negativa' : 'estavel') as 'positiva' | 'negativa' | 'estavel',
          percentual: Math.abs(Math.round(crescimentoReal))
        },
        previsaoProximoMes: {
          valor: previsaoProximoMes,
          confianca
        },
        atencaoNecessaria: [
          ...(crescimentoReal < -10 ? ['Declínio significativo na receita'] : []),
          ...(pedidosAtrasados > totalPedidos * 0.2 ? ['Alto número de pedidos atrasados'] : []),
          ...(eficienciaOperacional < 70 ? ['Eficiência operacional baixa'] : [])
        ]
      };

      // Calculate statistics
      const receitas = tendenciaReceita.map(t => t.receita).filter(r => r > 0);
      const maiorMes = tendenciaReceita.reduce((max, current) => 
        current.receita > max.receita ? current : max, tendenciaReceita[0] || { mes: '', receita: 0, crescimento: 0 });
      const menorMes = tendenciaReceita.reduce((min, current) => 
        current.receita < min.receita && current.receita > 0 ? current : min, 
        tendenciaReceita.find(t => t.receita > 0) || tendenciaReceita[0] || { mes: '', receita: 0, crescimento: 0 });

      const estatisticas = {
        maiorMes: { mes: maiorMes.mes, valor: maiorMes.receita },
        menorMes: { mes: menorMes.mes, valor: menorMes.receita },
        mediaMensal: receitas.length ? receitas.reduce((sum, r) => sum + r, 0) / receitas.length : 0,
        totalPedidos
      };

      setData({
        kpis: { receitaTotal, ticketMedio, taxaEntrega, previsaoProximoMes },
        tendenciaReceita,
        crescimentoClientes,
        topPerformers: { clientes: topClientes },
        metricas: { entregasNoPrazo, pedidosAtrasados, eficienciaOperacional },
        insights,
        variacoesResumo: tendenciaReceita.slice(-6).map(item => ({ 
          mes: item.mes, 
          receita: item.receita, 
          variacao: Math.round(item.crescimento)
        })),
        estatisticas
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  return { data, loading, refresh: loadAnalytics };
};
