import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Users,
  Package,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStatus, calculateBusinessDays, STAGE_SLAS, DELIVERY_SLA_BUSINESS_DAYS } from '@/lib/statusNormalizer';

interface AnalyticsData {
  deliveryTrend: Array<{ date: string; deliveries: number; onTime: number; delayed: number; }>;
  averageDeliveryTime: Array<{ cliente: string; avgDays: number; volume: number; }>;
  performanceMetrics: {
    onTimeRate: number;
    averageDeliveryDays: number;
    totalDeliveries: number;
    criticalDelays: number;
  };
  topClients: Array<{ cliente: string; volume: number; value: number; }>;
  monthComparison: {
    currentMonth: number;
    previousMonth: number;
    percentChange: number;
  };
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    deliveryTrend: [],
    averageDeliveryTime: [],
    performanceMetrics: {
      onTimeRate: 0,
      averageDeliveryDays: 0,
      totalDeliveries: 0,
      criticalDelays: 0
    },
    topClients: [],
    monthComparison: { currentMonth: 0, previousMonth: 0, percentChange: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Load envios data
      const { data: enviosData, error: enviosError } = await supabase
        .from('envios_processados')
        .select('*')
        .order('created_at', { ascending: false });

      if (enviosError) throw enviosError;

      // Load shipment history for real delivery data
      const { data: historyData, error: historyError } = await supabase
        .from('shipment_history')
        .select('*')
        .order('timestamp', { ascending: true });

      if (historyError) throw historyError;

      // Fetch real delivery dates from cargas.data_entrega via carga_sales_orders
      const deliveryDates: Record<string, Date> = {};
      const { data: cargoSOLinks } = await supabase
        .from('carga_sales_orders')
        .select('so_number, numero_carga');

      if (cargoSOLinks && cargoSOLinks.length > 0) {
        const cargoNumbers = [...new Set(cargoSOLinks.map(l => l.numero_carga))];
        const { data: cargasData } = await supabase
          .from('cargas')
          .select('numero_carga, data_entrega')
          .in('numero_carga', cargoNumbers)
          .not('data_entrega', 'is', null);

        const cargoDeliveryMap: Record<string, string> = {};
        cargasData?.forEach(c => {
          if (c.data_entrega) cargoDeliveryMap[c.numero_carga] = c.data_entrega;
        });

        cargoSOLinks.forEach(link => {
          const dd = cargoDeliveryMap[link.numero_carga];
          if (dd) deliveryDates[link.so_number] = new Date(dd);
        });
      }

      // Calculate time range filter
      const rangeMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const daysToFilter = rangeMap[timeRange] || 30;
      const cutoffDate = new Date(Date.now() - daysToFilter * 24 * 60 * 60 * 1000);

      // Filter data by time range
      const filteredEnvios = enviosData?.filter(e => 
        new Date(e.created_at || '') >= cutoffDate
      ) || [];

      // === DELIVERY TREND (Real Data) ===
      // Group deliveries by date from shipment_history
      const deliveryByDate = new Map<string, { total: number; onTime: number; delayed: number }>();
      
      // Initialize days in range
      for (let i = daysToFilter - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        deliveryByDate.set(key, { total: 0, onTime: 0, delayed: 0 });
      }

      // Count actual deliveries from shipment_history
      const deliveredSOs = new Set<string>();
      historyData?.forEach(h => {
        if (normalizeStatus(h.status) === 'Entregue' && !deliveredSOs.has(h.sales_order)) {
          deliveredSOs.add(h.sales_order);
          const date = new Date(h.timestamp || h.created_at || '');
          if (date >= cutoffDate) {
            const key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (deliveryByDate.has(key)) {
              const current = deliveryByDate.get(key)!;
              current.total++;
              
              // Check if delivered on time (within 15 business days of ship date)
              const envio = enviosData?.find(e => e.sales_order === h.sales_order);
              if (envio?.data_envio) {
                const bizDays = calculateBusinessDays(new Date(envio.data_envio), date);
                if (bizDays <= DELIVERY_SLA_BUSINESS_DAYS) {
                  current.onTime++;
                } else {
                  current.delayed++;
                }
              } else {
                current.onTime++; // Assume on time if no ship date
              }
            }
          }
        }
      });

      const deliveryTrend = Array.from(deliveryByDate.entries()).map(([date, data]) => ({
        date,
        deliveries: data.total,
        onTime: data.onTime,
        delayed: data.delayed
      }));

      // === AVERAGE DELIVERY TIME BY CLIENT (Real Data) ===
      const clientDeliveryTimes = new Map<string, { totalDays: number; count: number; volume: number; value: number }>();
      
      filteredEnvios.forEach(envio => {
        const cliente = envio.cliente;
        if (!clientDeliveryTimes.has(cliente)) {
          clientDeliveryTimes.set(cliente, { totalDays: 0, count: 0, volume: 0, value: 0 });
        }
        const data = clientDeliveryTimes.get(cliente)!;
        data.volume++;
        data.value += Number(envio.valor_total) || 0;
        
        // Calculate actual delivery time if delivered (data_envio → cargas.data_entrega)
        const realDeliveryDate = deliveryDates[envio.sales_order];
        if (envio.is_delivered && envio.data_envio && realDeliveryDate) {
          const shipDate = new Date(envio.data_envio);
          const days = calculateBusinessDays(shipDate, realDeliveryDate);
          if (days > 0 && days < 100) {
            data.totalDays += days;
            data.count++;
          }
        }
      });

      const averageDeliveryTime = Array.from(clientDeliveryTimes.entries())
        .map(([cliente, data]) => ({
          cliente,
          avgDays: data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
          volume: data.volume
        }))
        .filter(c => c.avgDays > 0)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10);

      // === PERFORMANCE METRICS (Real Data) ===
      const totalDeliveries = filteredEnvios.length;
      const deliveredOrders = filteredEnvios.filter(e => e.is_delivered);
      
      // Calculate on-time rate based on 15 calendar day SLA
      let onTimeCount = 0;
      let totalDelivered = 0;
      let totalDeliveryDays = 0;
      
      deliveredOrders.forEach(envio => {
        const realDeliveryDate = deliveryDates[envio.sales_order];
        if (envio.data_envio && realDeliveryDate) {
          totalDelivered++;
          const shipDate = new Date(envio.data_envio);
          const bizDays = calculateBusinessDays(shipDate, realDeliveryDate);

          if (bizDays <= DELIVERY_SLA_BUSINESS_DAYS) {
            onTimeCount++;
          }

          if (bizDays > 0 && bizDays < 100) {
            totalDeliveryDays += bizDays;
          }
        }
      });

      const onTimeRate = totalDelivered > 0 ? Math.round((onTimeCount / totalDelivered) * 100) : 0;
      const averageDeliveryDays = totalDelivered > 0 ? Math.round(totalDeliveryDays / totalDelivered) : 0;

      // Calculate critical delays (orders exceeding SLA by >50%)
      let criticalDelays = 0;
      filteredEnvios.forEach(envio => {
        if (envio.is_delivered) return;
        
        const status = normalizeStatus(envio.status_atual);
        const sla = STAGE_SLAS[status];
        
        if (sla && sla > 0) {
          const startDate = envio.data_ultima_atualizacao || envio.created_at;
          if (startDate) {
            const daysInStage = calculateBusinessDays(new Date(startDate), new Date());
            
            // Critical if more than 50% over SLA
            if (daysInStage > sla * 1.5) {
              criticalDelays++;
            }
          }
        }
      });

      // === TOP CLIENTS (Real Data) ===
      const topClients = Array.from(clientDeliveryTimes.entries())
        .map(([cliente, data]) => ({
          cliente,
          volume: data.volume,
          value: data.value
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      // === MONTH COMPARISON (Real Data) ===
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMonthDeliveries = filteredEnvios.filter(e => 
        new Date(e.created_at || '') >= currentMonthStart
      ).length;

      const previousMonthDeliveries = enviosData?.filter(e => {
        const date = new Date(e.created_at || '');
        return date >= previousMonthStart && date <= previousMonthEnd;
      }).length || 0;

      const percentChange = previousMonthDeliveries > 0 
        ? Math.round(((currentMonthDeliveries - previousMonthDeliveries) / previousMonthDeliveries) * 100)
        : 0;

      setData({
        deliveryTrend,
        averageDeliveryTime,
        performanceMetrics: {
          onTimeRate,
          averageDeliveryDays,
          totalDeliveries,
          criticalDelays
        },
        topClients,
        monthComparison: {
          currentMonth: currentMonthDeliveries,
          previousMonth: previousMonthDeliveries,
          percentChange
        }
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium">Período:</span>
        {['7d', '30d', '90d', '1y'].map((range) => (
          <Badge
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : range === '90d' ? '90 dias' : '1 ano'}
          </Badge>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Pontualidade</CardTitle>
            <CheckCircle className="h-4 w-4 text-status-delivered" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-delivered">
              {data.performanceMetrics.onTimeRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado no SLA de 15 dias úteis
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Entrega</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.performanceMetrics.averageDeliveryDays || '—'} dias
            </div>
            <p className="text-xs text-muted-foreground">
              Dias úteis (envio → entrega)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="h-4 w-4 text-status-shipping" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.performanceMetrics.totalDeliveries}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.monthComparison.percentChange >= 0 ? '+' : ''}{data.monthComparison.percentChange}% vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.performanceMetrics.criticalDelays}
            </div>
            <p className="text-xs text-muted-foreground">
              Pedidos acima de 150% do SLA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Delivery Trend Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência de Entregas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.deliveryTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="onTime" 
                  stroke="hsl(var(--status-delivered))" 
                  strokeWidth={2}
                  name="No Prazo"
                />
                <Line 
                  type="monotone" 
                  dataKey="delayed" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Atrasadas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 5 Clientes por Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topClients} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="cliente" type="category" className="text-xs" width={80} />
                <Tooltip formatter={(value) => [`${value} SOs`, 'Volume']} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Delivery Time by Client */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tempo Médio por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.averageDeliveryTime.length > 0 ? (
                data.averageDeliveryTime.slice(0, 5).map((client, index) => (
                  <div key={client.cliente} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{client.cliente}</p>
                        <p className="text-xs text-muted-foreground">{client.volume} envios</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{client.avgDays} dias</div>
                      <div className={`text-xs ${client.avgDays <= 15 ? 'text-status-delivered' : client.avgDays <= 18 ? 'text-status-production' : 'text-destructive'}`}>
                        {client.avgDays <= 15 ? 'No prazo' : client.avgDays <= 18 ? 'Próximo do SLA' : 'Acima do SLA'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Dados insuficientes para calcular tempo médio</p>
                  <p className="text-xs mt-1">Necessário ter entregas concluídas com data de envio</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
