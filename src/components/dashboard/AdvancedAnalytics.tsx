import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Clock, Users, Package, AlertTriangle, 
  CheckCircle, Truck, Calendar, DollarSign, BarChart3, Download,
  Target, Zap, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface AdvancedAnalyticsData {
  performanceKpis: {
    onTimeDeliveryRate: number;
    avgDeliveryTime: number;
    totalRevenue: number;
    totalOrders: number;
    activeClients: number;
    deliveryEfficiency: number;
  };
  trendAnalysis: Array<{
    date: string;
    deliveries: number;
    revenue: number;
    avgDeliveryTime: number;
  }>;
  clientPerformance: Array<{
    cliente: string;
    volume: number;
    revenue: number;
    avgValue: number;
  }>;
  predictiveInsights: {
    nextMonthProjection: { value: number; confidence: number };
    riskFactors: Array<{ factor: string; level: 'low' | 'medium' | 'high' }>;
  };
}

const AdvancedAnalytics: React.FC = () => {
  const [data, setData] = useState<AdvancedAnalyticsData>({
    performanceKpis: {
      onTimeDeliveryRate: 0,
      avgDeliveryTime: 0,
      totalRevenue: 0,
      totalOrders: 0,
      activeClients: 0,
      deliveryEfficiency: 0
    },
    trendAnalysis: [],
    clientPerformance: [],
    predictiveInsights: {
      nextMonthProjection: { value: 0, confidence: 0 },
      riskFactors: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3m');

  const loadAdvancedAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date filter
      const now = new Date();
      const months = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
      const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);

      const { data: enviosData, error } = await supabase
        .from('envios_processados')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate Performance KPIs
      const totalOrders = enviosData?.length || 0;
      const deliveredOrders = enviosData?.filter(e => e.is_delivered) || [];
      const onTimeDeliveries = deliveredOrders.length;
      const onTimeDeliveryRate = totalOrders > 0 ? (onTimeDeliveries / totalOrders) * 100 : 0;
      
      // Calculate real average delivery time
      const ordersWithDates = deliveredOrders.filter(e => e.data_envio && e.created_at);
      const avgDeliveryTime = ordersWithDates.length > 0
        ? ordersWithDates.reduce((sum, e) => {
            const created = new Date(e.created_at);
            const delivered = new Date(e.data_envio!);
            return sum + Math.floor((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / ordersWithDates.length
        : 0;

      const totalRevenue = enviosData?.reduce((sum, e) => sum + (Number(e.valor_total) || 0), 0) || 0;
      const activeClients = new Set(enviosData?.map(e => e.cliente)).size;
      const deliveryEfficiency = totalOrders > 0 ? (deliveredOrders.length / totalOrders) * 100 : 0;

      // Trend Analysis (last 12 months)
      const monthlyData = new Map<string, { deliveries: number; revenue: number; deliveryTimes: number[] }>();
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        monthlyData.set(key, { deliveries: 0, revenue: 0, deliveryTimes: [] });
      }

      enviosData?.forEach(envio => {
        const date = new Date(envio.created_at);
        const key = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (monthlyData.has(key)) {
          const month = monthlyData.get(key)!;
          month.deliveries += 1;
          month.revenue += Number(envio.valor_total) || 0;
          if (envio.is_delivered && envio.data_envio) {
            const created = new Date(envio.created_at);
            const delivered = new Date(envio.data_envio);
            const diffDays = Math.floor((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            month.deliveryTimes.push(diffDays);
          }
        }
      });

      const trendAnalysis = Array.from(monthlyData.entries()).map(([date, data]) => ({
        date,
        deliveries: data.deliveries,
        revenue: data.revenue,
        avgDeliveryTime: data.deliveryTimes.length > 0 
          ? data.deliveryTimes.reduce((a, b) => a + b, 0) / data.deliveryTimes.length 
          : 0
      }));

      // Client Performance
      const clientMap = new Map<string, { volume: number; revenue: number }>();
      enviosData?.forEach(envio => {
        const cliente = envio.cliente;
        if (!clientMap.has(cliente)) {
          clientMap.set(cliente, { volume: 0, revenue: 0 });
        }
        const client = clientMap.get(cliente)!;
        client.volume += 1;
        client.revenue += Number(envio.valor_total) || 0;
      });

      const clientPerformance = Array.from(clientMap.entries())
        .map(([cliente, data]) => ({
          cliente,
          volume: data.volume,
          revenue: data.revenue,
          avgValue: data.revenue / data.volume
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Predictive Insights - Simple linear regression
      const recentMonths = trendAnalysis.slice(-3);
      const avgRecentRevenue = recentMonths.reduce((sum, m) => sum + m.revenue, 0) / recentMonths.length;
      const growthRate = recentMonths.length >= 2
        ? (recentMonths[recentMonths.length - 1].revenue - recentMonths[0].revenue) / recentMonths[0].revenue
        : 0;
      
      const nextMonthProjection = avgRecentRevenue * (1 + growthRate);
      const confidence = Math.min(85, 65 + (recentMonths.length * 5));

      // Risk factors based on real data
      const riskFactors: Array<{ factor: string; level: 'low' | 'medium' | 'high' }> = [];
      
      if (onTimeDeliveryRate < 70) {
        riskFactors.push({ factor: 'Taxa de entrega no prazo baixa', level: 'high' });
      } else if (onTimeDeliveryRate < 85) {
        riskFactors.push({ factor: 'Taxa de entrega no prazo moderada', level: 'medium' });
      }
      
      if (avgDeliveryTime > 30) {
        riskFactors.push({ factor: 'Tempo médio de entrega elevado', level: 'high' });
      } else if (avgDeliveryTime > 20) {
        riskFactors.push({ factor: 'Tempo de entrega acima da média', level: 'medium' });
      }
      
      if (growthRate < -0.1) {
        riskFactors.push({ factor: 'Tendência de receita negativa', level: 'high' });
      } else if (growthRate < 0) {
        riskFactors.push({ factor: 'Crescimento estagnado', level: 'medium' });
      }

      setData({
        performanceKpis: {
          onTimeDeliveryRate: Math.round(onTimeDeliveryRate),
          avgDeliveryTime: Math.round(avgDeliveryTime),
          totalRevenue,
          totalOrders,
          activeClients,
          deliveryEfficiency: Math.round(deliveryEfficiency)
        },
        trendAnalysis,
        clientPerformance,
        predictiveInsights: {
          nextMonthProjection: { value: nextMonthProjection, confidence },
          riskFactors
        }
      });

    } catch (error) {
      console.error('Error loading advanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdvancedAnalytics();
  }, [timeRange]);

  const exportToPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const element = document.getElementById('analytics-dashboard');
    
    if (element) {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const imgWidth = 190;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('analytics-dashboard.pdf');
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const kpisData = Object.entries(data.performanceKpis).map(([key, value]) => ({
      Métrica: key,
      Valor: value
    }));
    const kpisSheet = XLSX.utils.json_to_sheet(kpisData);
    XLSX.utils.book_append_sheet(workbook, kpisSheet, 'KPIs');

    const clientSheet = XLSX.utils.json_to_sheet(data.clientPerformance);
    XLSX.utils.book_append_sheet(workbook, clientSheet, 'Performance Clientes');

    const trendSheet = XLSX.utils.json_to_sheet(data.trendAnalysis);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Tendências');

    XLSX.writeFile(workbook, 'analytics-data.xlsx');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
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
    <div id="analytics-dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Avançado</h2>
          <p className="text-muted-foreground">Insights detalhados baseados em dados reais</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Período:</span>
        {[
          { key: '1m', label: '1 Mês' },
          { key: '3m', label: '3 Meses' },
          { key: '6m', label: '6 Meses' },
          { key: '1y', label: '1 Ano' }
        ].map((range) => (
          <Badge
            key={range.key}
            variant={timeRange === range.key ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => setTimeRange(range.key)}
          >
            {range.label}
          </Badge>
        ))}
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taxa Pontualidade</CardTitle>
                <Target className="h-4 w-4 text-status-delivered" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-status-delivered">
                  {data.performanceKpis.onTimeDeliveryRate}%
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio Entrega</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.performanceKpis.avgDeliveryTime} dias
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-status-delivered" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.performanceKpis.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.performanceKpis.totalOrders}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                <Users className="h-4 w-4 text-status-shipping" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.performanceKpis.activeClients}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Eficiência Entrega</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.performanceKpis.deliveryEfficiency}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendências Mensais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.trendAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="deliveries" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    name="Entregas" 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="avgDeliveryTime" 
                    stroke="hsl(var(--status-production))" 
                    strokeWidth={2} 
                    name="Tempo Médio (dias)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Tendência de Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.trendAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Receita']} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--status-delivered))" 
                    fill="hsl(var(--status-delivered))" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 10 Clientes por Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.clientPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="cliente" type="category" className="text-xs" width={150} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Receita']} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Performance Detalhada dos Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.clientPerformance.map((client, index) => (
                  <div key={client.cliente} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{client.cliente}</div>
                        <div className="text-xs text-muted-foreground">{client.volume} pedidos</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(client.revenue)}</div>
                      <div className="text-xs text-muted-foreground">
                        Ticket: {formatCurrency(client.avgValue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-status-delivered" />
                  Projeção Próximo Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-status-delivered mb-2">
                  {formatCurrency(data.predictiveInsights.nextMonthProjection.value)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Confiança: {data.predictiveInsights.nextMonthProjection.confidence}%
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Baseado em análise de tendência dos últimos 3 meses
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-status-production" />
                  Fatores de Risco
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.predictiveInsights.riskFactors.length === 0 ? (
                  <div className="flex items-center gap-2 text-status-delivered">
                    <CheckCircle className="h-5 w-5" />
                    <span>Nenhum fator de risco identificado</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.predictiveInsights.riskFactors.map((risk, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${
                          risk.level === 'high' ? 'bg-destructive/5 border-destructive/20' :
                          risk.level === 'medium' ? 'bg-status-production/5 border-status-production/20' :
                          'bg-blue-500/5 border-blue-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{risk.factor}</span>
                          <Badge variant={risk.level === 'high' ? 'destructive' : 'secondary'}>
                            {risk.level}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;
