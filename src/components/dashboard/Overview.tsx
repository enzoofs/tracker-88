import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Package, Clock, TrendingUp, Ship, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getCriticalSummary } from '@/hooks/useAlertLevel';

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
      emTransito: number;
    };
  };
  allSOs?: any[];
}

const Overview: React.FC<OverviewProps> = ({ data, allSOs = [] }) => {
  const criticalSummary = getCriticalSummary(allSOs);
  
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
      value: criticalSummary.total,
      icon: AlertCircle,
      variant: "alert" as const,
      trend: "atenção",
      details: criticalSummary
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
          const isCriticalCard = metric.variant === 'alert';
          
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
                {isCriticalCard && metric.details && metric.details.total > 0 ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="mt-2 h-auto p-0 text-destructive hover:text-destructive/80">
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-corporate cursor-pointer hover:bg-destructive/20">
                          Ver Detalhes
                        </Badge>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="start">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Problemas Críticos Detectados</h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center p-2 bg-destructive/5 rounded">
                            <span className="text-muted-foreground">Críticos (&gt;5 dias):</span>
                            <Badge variant="destructive" className="text-xs">{metric.details.byLevel.critical}</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-orange-500/5 rounded">
                            <span className="text-muted-foreground">Atenção (3-5 dias):</span>
                            <Badge className="bg-orange-500 text-white text-xs">{metric.details.byLevel.warning}</Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-yellow-500/5 rounded">
                            <span className="text-muted-foreground">Aviso (1-2 dias):</span>
                            <Badge className="bg-yellow-500 text-white text-xs">{metric.details.byLevel.attention}</Badge>
                          </div>
                        </div>
                        {Object.keys(metric.details.byStage).length > 0 && (
                          <>
                            <div className="border-t pt-2 mt-2">
                              <p className="text-xs font-semibold mb-2">Por Etapa:</p>
                              <div className="space-y-1">
                                {Object.entries(metric.details.byStage).map(([stage, count]) => (
                                  <div key={stage} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground capitalize">{stage}:</span>
                                    <span className="font-semibold">{count} SO(s)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Badge className="mt-2 bg-primary/10 text-primary border-primary/20 font-corporate">
                    {metric.trend}
                  </Badge>
                )}
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
            <div className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate">
              <div className="text-2xl font-corporate font-bold text-status-production">
                {data.statusCounts?.emProducao || 0}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Produção</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate">
              <div className="text-2xl font-corporate font-bold text-status-shipping">
                {data.statusCounts?.emImportacao || 0}
              </div>
              <div className="text-sm text-muted-foreground font-corporate">Em Importação</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate">
              <div className="text-2xl font-corporate font-bold text-status-transit">
                {data.statusCounts?.emTransito || 0}
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