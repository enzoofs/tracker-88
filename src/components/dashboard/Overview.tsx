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
    <div className="space-y-8 animate-fade-in">
      {/* Modern KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <Ship className="h-5 w-5 text-primary" />
            Status em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30 hover-corporate">
              <div className="text-2xl font-corporate font-bold text-status-production">
                {Math.floor(data.activeSOs * 0.3)}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Produção</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30 hover-corporate">
              <div className="text-2xl font-corporate font-bold text-status-shipping">
                {Math.floor(data.activeSOs * 0.4)}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Importação</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30 hover-corporate">
              <div className="text-2xl font-corporate font-bold text-status-transit">
                {Math.floor(data.activeSOs * 0.3)}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Trânsito</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;