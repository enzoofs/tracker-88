import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Info, AlertTriangle, DollarSign, Users, Activity
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/formatters';

const TrendsAnalysis: React.FC = () => {
  const { data, loading } = useAnalytics();
  const [atencaoDialogOpen, setAtencaoDialogOpen] = useState(false);


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getTrendIcon = (tipo: 'positiva' | 'negativa' | 'estavel') => {
    switch (tipo) {
      case 'positiva':
        return <TrendingUp className="h-4 w-4 text-status-delivered" />;
      case 'negativa':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getTrendColor = (tipo: 'positiva' | 'negativa' | 'estavel') => {
    switch (tipo) {
      case 'positiva':
        return 'text-status-delivered';
      case 'negativa':
        return 'text-destructive';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Insights Automáticos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência de Crescimento</CardTitle>
            {getTrendIcon(data.insights.tendenciaCrescimento.tipo)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getTrendColor(data.insights.tendenciaCrescimento.tipo)}`}>
              {data.insights.tendenciaCrescimento.percentual.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tendência {data.insights.tendenciaCrescimento.tipo}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão Próximo Mês</CardTitle>
            <Info className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.insights.previsaoProximoMes.valor)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.insights.previsaoProximoMes.confianca}% de confiança
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setAtencaoDialogOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atenção Necessária</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-production" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-production mb-1">
              {data.insights.atencaoNecessaria.length}
            </div>
            <p className="text-xs text-muted-foreground break-words">
              {data.insights.atencaoNecessaria.length > 0 ? 'Itens requerem atenção' : 'Tudo funcionando bem'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Atenção Necessária */}
      <Dialog open={atencaoDialogOpen} onOpenChange={setAtencaoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-production" />
              Itens que Requerem Atenção ({data.insights.atencaoNecessaria.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {data.insights.atencaoNecessaria.length > 0 ? (
              <div className="space-y-3">
                {data.insights.atencaoNecessaria.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-status-production/5 border-status-production/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-status-production mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg font-medium">Tudo funcionando perfeitamente!</p>
                <p className="text-sm mt-2">Não há itens que requerem atenção no momento.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sub-abas Detalhadas */}
      <Tabs defaultValue="receita" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receita">Receita</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="receita" className="space-y-6">
          {/* Gráfico de Tendência de Receita */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-status-delivered" />
                Tendência de Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.tendenciaReceita}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Receita']} />
                  <Line 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="hsl(var(--status-delivered))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--status-delivered))', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grid com Variações Mensais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Variações Mensais (Últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.variacoesResumo.map((item, index) => (
                    <div key={item.mes} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.mes}</span>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(item.receita)}</div>
                        <div className={`text-xs ${item.variacao >= 0 ? 'text-status-delivered' : 'text-destructive'}`}>
                          {item.variacao >= 0 ? '+' : ''}{item.variacao.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Resumo Estatístico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Maior mês:</span>
                    <div className="text-right">
                      <div className="font-bold">{data.estatisticas.maiorMes.mes}</div>
                      <div className="text-sm">{formatCurrency(data.estatisticas.maiorMes.valor)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Menor mês:</span>
                    <div className="text-right">
                      <div className="font-bold">{data.estatisticas.menorMes.mes}</div>
                      <div className="text-sm">{formatCurrency(data.estatisticas.menorMes.valor)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Média mensal:</span>
                    <div className="font-bold">{formatCurrency(data.estatisticas.mediaMensal)}</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total de pedidos:</span>
                    <div className="font-bold">{data.estatisticas.totalPedidos}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-6">
          {/* Gráfico de Evolução da Base de Clientes */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-status-shipping" />
                Evolução da Base de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.crescimentoClientes}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="novosClientes" 
                    stroke="hsl(var(--status-shipping))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--status-shipping))', strokeWidth: 2, r: 5 }}
                    name="Novos Clientes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Métricas em Grid 2x4 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{data.totalClientesUnicos}</div>
                  <div className="text-xs text-muted-foreground">Total de Clientes</div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-status-delivered">
                    {data.crescimentoClientes.length > 0
                      ? data.crescimentoClientes[data.crescimentoClientes.length - 1].novosClientes
                      : 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Novos este Mês</div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-status-shipping">
                    {(() => {
                      const mesesComNovos = data.crescimentoClientes.filter(m => m.novosClientes > 0);
                      return mesesComNovos.length > 0
                        ? Math.round(mesesComNovos.reduce((sum, m) => sum + m.novosClientes, 0) / mesesComNovos.length)
                        : 0;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Média Mensal</div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-status-production">
                    {formatCurrency(data.kpis.ticketMedio)}
                  </div>
                  <div className="text-xs text-muted-foreground">Valor por Cliente</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card com Tendências */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Tendências de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Crescimento</span>
                      <span className={`text-sm font-bold ${getTrendColor(data.insights.tendenciaCrescimento.tipo)}`}>
                        {data.insights.tendenciaCrescimento.percentual.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(data.insights.tendenciaCrescimento.percentual, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Eficiência</span>
                      <span className="text-sm font-bold text-primary">
                        {data.metricas.eficienciaOperacional}%
                      </span>
                    </div>
                    <Progress value={data.metricas.eficienciaOperacional} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Ticket Médio</span>
                      <span className="text-sm font-bold text-status-delivered">
                        {formatCurrency(data.kpis.ticketMedio)}
                      </span>
                    </div>
                    <Progress value={Math.min(100, (data.kpis.ticketMedio / (data.estatisticas.mediaMensal || 1)) * 100)} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card com Projeções */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-status-delivered" />
                  Projeções e Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Previsão Próximo Mês</span>
                      <span className="text-sm font-bold">
                        {formatCurrency(data.insights.previsaoProximoMes.valor)}
                      </span>
                    </div>
                    <Progress value={data.insights.previsaoProximoMes.confianca} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {data.insights.previsaoProximoMes.confianca}% de confiança
                    </div>
                  </div>
                  {data.insights.atencaoNecessaria.length > 0 && (
                    <div className="mt-4 p-3 bg-status-production/10 rounded-lg border border-status-production/20">
                      <div className="text-sm font-medium text-status-production mb-2">
                        Itens que Requerem Atenção:
                      </div>
                      <ul className="text-xs text-status-production space-y-1">
                        {data.insights.atencaoNecessaria.map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrendsAnalysis;