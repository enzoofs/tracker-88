import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Package, Clock, TrendingUp, Plane, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCriticalSummary } from '@/hooks/useAlertLevel';
import { StatusDetailDialog } from './StatusDetailDialog';
import { useSLACalculator } from '@/hooks/useSLACalculator';

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

  // Calcular valor total em movimento
  const totalValue = allSOs
    .filter(so => !so.isDelivered)
    .reduce((sum, so) => sum + (so.valorTotal || 0), 0);
  
  const handleCardClick = (category: 'producao' | 'importacao' | 'atrasadas') => {
    const filtered = allSOs.filter(so => {
      if (category === 'producao') {
        return so.statusAtual === 'Em Produção';
      }
      if (category === 'importacao') {
        const status = so.statusAtual?.toLowerCase() || '';
        return status.includes('importação') ||
               status.includes('importacao') ||
               status.includes('fedex') ||
               status.includes('embarque') ||
               status.includes('voo internacional') ||
               status.includes('trânsito') ||
               status.includes('transito');
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
  
  const metricCards = [
    {
      title: "SOs Ativas",
      value: data.activeSOs,
      icon: Package,
      variant: "default" as const,
      trend: "+12%"
    },
    {
      title: "Chegadas Previstas",
      value: data.expectedArrivals,
      icon: Clock,
      variant: "transit" as const,
      trend: "próximos 7 dias"
    },
    {
      title: "Valor em Movimento",
      value: `R$ ${(totalValue / 1000).toFixed(0)}k`,
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