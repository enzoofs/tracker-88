import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Clock, TrendingUp, Ship, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OverviewProps {
  data: {
    activeSOs: number;
    inTransit: number;
    expectedArrivals: number;
    deliveryTrend: Array<{ date: string; deliveries: number; }>;
    criticalShipments: number;
  };
}

const Overview: React.FC<OverviewProps> = ({ data }) => {
  const metricCards = [
    {
      title: "SOs Ativas",
      value: data.activeSOs,
      icon: Package,
      variant: "default" as const,
      trend: "+12%"
    },
    {
      title: "Em Trânsito",
      value: data.inTransit,
      icon: Truck,
      variant: "shipping" as const,
      trend: "+5%"
    },
    {
      title: "Chegadas Previstas",
      value: data.expectedArrivals,
      icon: Clock,
      variant: "transit" as const,
      trend: "próximos 7 dias"
    },
    {
      title: "Críticos",
      value: data.criticalShipments,
      icon: AlertCircle,
      variant: "alert" as const,
      trend: "atenção"
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
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className={`shadow-card transition-smooth hover:shadow-lg ${getCardStyles(metric.variant)}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${getIconColor(metric.variant)}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <Badge variant="outline" className="mt-1 text-xs">
                  {metric.trend}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {/* Real-time Status */}
      <Card className="shadow-card bg-gradient-logistics">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            Status em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/10">
              <div className="text-2xl font-bold text-status-production">
                {Math.floor(data.activeSOs * 0.3)}
              </div>
              <div className="text-sm text-muted-foreground">Em Produção</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/10">
              <div className="text-2xl font-bold text-status-shipping">
                {Math.floor(data.activeSOs * 0.4)}
              </div>
              <div className="text-sm text-muted-foreground">Em Importação</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/10">
              <div className="text-2xl font-bold text-status-transit">
                {Math.floor(data.activeSOs * 0.3)}
              </div>
              <div className="text-sm text-muted-foreground">Em Trânsito</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;