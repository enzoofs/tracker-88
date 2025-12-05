import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Clock, TrendingUp, TrendingDown, Minus, Plane, AlertCircle, CheckCircle } from 'lucide-react';
import { StatusDetailDialog } from './StatusDetailDialog';
import { useSLACalculator } from '@/hooks/useSLACalculator';
import { calculateBusinessDays } from '@/lib/statusNormalizer';

interface OverviewProps {
  data: {
    activeSOs: number;
    inTransit: number;
    expectedArrivals: number;
    deliveryTrend: Array<{ date: string; deliveries: number; }>;
    criticalShipments: number;
    statusCounts?: {
      emProducao: number;
      emImportacao: number;
      atrasadas: number;
    };
  };
  allSOs?: any[];
}

const Overview: React.FC<OverviewProps> = ({ data, allSOs = [] }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogSOs, setDialogSOs] = useState<any[]>([]);

  // Calculate real metrics from allSOs data
  const metrics = useMemo(() => {
    // Valor total em movimento
    const totalValue = allSOs
      .filter(so => !so.isDelivered)
      .reduce((sum, so) => sum + (so.valorTotal || 0), 0);
    
    // Taxa de entrega no prazo - cálculo real baseado em SLA de 10 dias úteis
    // Filtrar para últimos 30 dias (consistente com Analytics)
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentSOs = allSOs.filter(so => {
      const createdAt = so.createdAt ? new Date(so.createdAt) : null;
      return createdAt && createdAt >= cutoffDate;
    });
    
    const deliveredSOs = recentSOs.filter(so => so.isDelivered);
    let onTimeCount = 0;
    let totalWithShipDate = 0;
    
    deliveredSOs.forEach(so => {
      // Só conta se tiver data de envio para calcular o SLA
      if (so.dataEnvio) {
        totalWithShipDate++;
        const shipDate = new Date(so.dataEnvio);
        const deliveryDate = new Date(so.dataUltimaAtualizacao || Date.now());
        const businessDays = calculateBusinessDays(shipDate, deliveryDate);
        
        // SLA de 10 dias úteis
        if (businessDays <= 10) {
          onTimeCount++;
        }
      }
    });
    
    const taxaEntregaNoPrazo = totalWithShipDate > 0 
      ? Math.round((onTimeCount / totalWithShipDate) * 100) 
      : 0;
    
    // Calculate month-over-month trend for active SOs
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentMonthSOs = allSOs.filter(so => {
      const date = so.dataOrdem ? new Date(so.dataOrdem) : null;
      return date && date >= currentMonthStart;
    }).length;
    
    const previousMonthSOs = allSOs.filter(so => {
      const date = so.dataOrdem ? new Date(so.dataOrdem) : null;
      return date && date >= previousMonthStart && date <= previousMonthEnd;
    }).length;
    
    const percentChange = previousMonthSOs > 0 
      ? Math.round(((currentMonthSOs - previousMonthSOs) / previousMonthSOs) * 100)
      : 0;
    
    return {
      totalValue,
      taxaEntregaNoPrazo,
      percentChange,
      currentMonthSOs,
      previousMonthSOs
    };
  }, [allSOs]);
  
  const handleCardClick = (category: 'producao' | 'importacao' | 'atrasadas') => {
    const filtered = allSOs.filter(so => {
      if (category === 'producao') {
        return so.statusAtual === 'Em Produção';
      }
      if (category === 'importacao') {
        const status = so.statusAtual?.toLowerCase() || '';
        const isProduction = status.includes('produção') || status.includes('producao');
        const isDelivered = so.isDelivered || status.includes('entregue');
        return !isProduction && !isDelivered;
      }
      if (category === 'atrasadas') {
        if (so.isDelivered) return false;
        const sla = useSLACalculator(so);
        return sla?.urgency === 'overdue';
      }
      return false;
    });
    
    setDialogTitle(
      category === 'producao' ? 'SOs em Produção' :
      category === 'importacao' ? 'SOs em Importação' :
      'SOs Atrasadas'
    );
    setDialogSOs(filtered);
    setDialogOpen(true);
  };

  // Determine trend icon and text
  const getTrendInfo = () => {
    if (metrics.percentChange > 0) {
      return {
        icon: TrendingUp,
        text: `+${metrics.percentChange}% vs mês anterior`,
        color: 'text-status-delivered'
      };
    } else if (metrics.percentChange < 0) {
      return {
        icon: TrendingDown,
        text: `${metrics.percentChange}% vs mês anterior`,
        color: 'text-destructive'
      };
    } else {
      return {
        icon: Minus,
        text: 'Estável vs mês anterior',
        color: 'text-muted-foreground'
      };
    }
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.icon;

  const metricCards = [
    {
      title: "SOs Ativas",
      value: data.activeSOs,
      icon: Package,
      variant: "default" as const,
      trend: metrics.percentChange !== 0 
        ? `${metrics.percentChange > 0 ? '+' : ''}${metrics.percentChange}% vs mês anterior`
        : 'Estável'
    },
    {
      title: "Taxa de Entrega no Prazo",
      value: `${metrics.taxaEntregaNoPrazo}%`,
      icon: CheckCircle,
      variant: "delivered" as const,
      trend: "dos pedidos entregues"
    },
    {
      title: "Valor em Movimento",
      value: `R$ ${(metrics.totalValue / 1000).toFixed(0)}k`,
      icon: TrendingUp,
      variant: "shipping" as const,
      trend: "total ativo"
    }
  ];

  const getCardStyles = (variant: string) => {
    switch (variant) {
      case 'shipping':
        return 'border-status-shipping bg-status-shipping/5';
      case 'transit':
        return 'border-status-transit bg-status-transit/5';
      case 'alert':
        return 'border-status-alert bg-status-alert/5';
      default:
        return 'border-primary bg-primary/5';
    }
  };

  const getIconColor = (variant: string) => {
    switch (variant) {
      case 'shipping':
        return 'text-status-shipping';
      case 'transit':
        return 'text-status-transit';
      case 'alert':
        return 'text-status-alert';
      case 'delivered':
        return 'text-status-delivered';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          
          return (
            <Card 
              key={metric.title} 
              className="corporate-card hover-corporate border-border/50 group animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-corporate text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-gradient-corporate shadow-corporate">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-corporate font-semibold text-foreground group-hover:text-primary transition-colors">
                  {metric.value}
                </div>
                <Badge className="mt-2 bg-primary/10 text-primary border-primary/20 font-corporate">
                  {metric.trend}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {/* Real-time Status */}
      <Card className="shadow-corporate bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-corporate">
            <Plane className="h-5 w-5 text-primary" />
            Status em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate cursor-pointer transition-all hover:shadow-md hover:scale-105"
              onClick={() => handleCardClick('producao')}
            >
              <div className="text-2xl font-corporate font-bold text-status-production">
                {data.statusCounts?.emProducao || 0}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Produção</div>
            </div>
            <div 
              className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate cursor-pointer transition-all hover:shadow-md hover:scale-105"
              onClick={() => handleCardClick('importacao')}
            >
              <div className="text-2xl font-corporate font-bold text-status-shipping">
                {data.statusCounts?.emImportacao || 0}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Importação</div>
            </div>
            <div 
              className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate cursor-pointer transition-all hover:shadow-md hover:scale-105"
              onClick={() => handleCardClick('atrasadas')}
            >
              <div className="text-2xl font-corporate font-bold text-destructive">
                {data.statusCounts?.atrasadas || 0}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Atrasadas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <StatusDetailDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogTitle}
        sos={dialogSOs}
      />
    </div>
  );
};

export default Overview;
