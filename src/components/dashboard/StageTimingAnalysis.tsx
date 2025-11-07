import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useStageTimingData } from '@/hooks/useStageTimingData';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
            Análise de Tempo por Etapa
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-status-delivered" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-status-warning" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-status-critical" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string, variance: number) => {
    if (status === 'ok') {
      return <Badge variant="outline" className="bg-status-delivered/10 text-status-delivered border-status-delivered/20">No prazo</Badge>;
    } else if (status === 'warning') {
      return <Badge variant="outline" className="bg-status-warning/10 text-status-warning border-status-warning/20">+{variance}%</Badge>;
    } else {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        +{variance}%
      </Badge>;
    }
  };

  const isWithinSLA = data.totalAverageDays <= data.totalSLA;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Análise de Tempo por Etapa
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Tempo médio nas 4 etapas principais do processo vs. SLA esperado
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tempo Total</p>
            <p className="text-2xl font-bold">{data.totalAverageDays}d / {data.totalSLA}d</p>
            {isWithinSLA ? (
              <Badge variant="outline" className="mt-1 bg-status-delivered/10 text-status-delivered border-status-delivered/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Dentro do SLA
              </Badge>
            ) : (
              <Badge variant="destructive" className="mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Fora do SLA
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-center">Tempo Médio</TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          SLA
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          SLA (Service Level Agreement) é o tempo máximo esperado para cada etapa do processo logístico.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[200px]">Progresso vs SLA</TableHead>
                <TableHead className="text-center">Min - Máx</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.stages.map((stage, index) => {
                const slaPercentage = Math.min((stage.avgDays / stage.sla) * 100, 100);
                
                return (
                  <TableRow key={stage.stage}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(stage.status)}
                        {stage.stage}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stage.count} registros
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">{stage.avgDays}d</span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {stage.sla}d
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(stage.status, stage.slaVariance)}
                    </TableCell>
                    <TableCell>
                      <Progress 
                        value={slaPercentage} 
                        className={`h-2 ${
                          stage.status === 'critical' ? 'bg-destructive/20' : 
                          stage.status === 'warning' ? 'bg-status-warning/20' : 
                          'bg-status-delivered/20'
                        }`}
                      />
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {stage.minDays}d - {stage.maxDays}d
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Insights */}
        {data.stages.some(s => s.status !== 'ok') && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="font-medium text-sm">Etapas que requerem atenção:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.stages
                    .filter(s => s.status !== 'ok')
                    .map(stage => (
                      <li key={stage.stage}>
                        <strong>{stage.stage}:</strong> está {stage.slaVariance}% acima do SLA esperado 
                        ({stage.avgDays}d vs {stage.sla}d)
                        {stage.status === 'critical' && ' - requer ação imediata'}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StageTimingAnalysis;
