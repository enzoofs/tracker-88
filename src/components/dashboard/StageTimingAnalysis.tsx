import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { useStageTimingData } from '@/hooks/useStageTimingData';
import { Progress } from '@/components/ui/progress';

const StageTimingAnalysis: React.FC = () => {
  const { data, loading } = useStageTimingData();

  if (loading) {
    return (
      <Card className="shadow-card animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.stages.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo Médio por Etapa do Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Dados insuficientes para análise de tempo por etapa.</p>
            <p className="text-sm mt-2">Aguarde mais transições de status serem registradas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxDays = Math.max(...data.stages.map(s => s.avgDays));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tempo Total Médio do Processo</p>
              <p className="text-3xl font-bold mt-1">{data.totalAverageDays} dias</p>
            </div>
            <TrendingUp className="h-12 w-12 text-primary opacity-50" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Do início da produção até a entrega final
          </p>
        </CardContent>
      </Card>

      {/* Stage Timeline */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo Médio por Etapa do Processo
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Análise detalhada do tempo gasto em cada etapa da importação
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {data.stages.map((stage, index) => {
              const percentage = (stage.avgDays / maxDays) * 100;
              
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stage.stage}</span>
                          {stage.isBottleneck && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Gargalo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stage.count} transições registradas
                        </p>
                      </div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <div className="text-lg font-bold">{stage.avgDays} dias</div>
                      <div className="text-xs text-muted-foreground">
                        {stage.minDays} - {stage.maxDays} dias
                      </div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={percentage} 
                    className={`h-3 ${stage.isBottleneck ? 'bg-destructive/20' : ''}`}
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mínimo: {stage.minDays}d</span>
                    <span>Média: {stage.avgDays}d</span>
                    <span>Máximo: {stage.maxDays}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights Card */}
      <Card className="shadow-card border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Gargalos Identificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.stages.filter(s => s.isBottleneck).length > 0 ? (
            <div className="space-y-3">
              {data.stages.filter(s => s.isBottleneck).map(stage => (
                <div key={stage.stage} className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <div>
                    <p className="font-medium">{stage.stage}</p>
                    <p className="text-xs text-muted-foreground">
                      Tempo médio 20% acima da média geral
                    </p>
                  </div>
                  <Badge variant="destructive">{stage.avgDays} dias</Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">
                💡 <strong>Recomendação:</strong> Foque em otimizar estas etapas para reduzir o tempo total de entrega.
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">✅ Nenhum gargalo crítico identificado</p>
              <p className="text-xs mt-2">O processo está equilibrado entre as etapas.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StageTimingAnalysis;
