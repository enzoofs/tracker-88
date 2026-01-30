import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, Target, TrendingUp, Trophy, Medal, Award
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/lib/formatters';

const ExecutiveDashboard: FC = () => {
  const { data, loading } = useAnalytics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

  const getBadgeIcon = (badge: 'ouro' | 'prata' | 'bronze') => {
    switch (badge) {
      case 'ouro':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'prata':
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 'bronze':
        return <Award className="h-4 w-4 text-orange-600" />;
    }
  };

  const getBadgeColor = (badge: 'ouro' | 'prata' | 'bronze') => {
    switch (badge) {
      case 'ouro':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'prata':
        return 'bg-gray-50 text-gray-800 border-gray-200';
      case 'bronze':
        return 'bg-orange-50 text-orange-800 border-orange-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-status-delivered" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-delivered">
              {formatCurrency(data.kpis.receitaTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{data.insights.tendenciaCrescimento.percentual.toFixed(1)}% vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.kpis.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por pedido
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão Próximo Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-status-production" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-production">
              {formatCurrency(data.kpis.previsaoProximoMes)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.insights.previsaoProximoMes.confianca}% confiança
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Tendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-status-delivered" />
              Evolução da Receita (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                  dot={{ fill: 'hsl(var(--status-delivered))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-status-shipping" />
              Crescimento de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                  dot={{ fill: 'hsl(var(--status-shipping))', strokeWidth: 2, r: 4 }}
                  name="Novos Clientes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Clientes por Valor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topPerformers.clientes.map((cliente, index) => (
              <div key={cliente.nome} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded-md border ${getBadgeColor(cliente.badge)} flex items-center gap-1`}>
                    {getBadgeIcon(cliente.badge)}
                    <span className="text-xs font-medium">#{index + 1}</span>
                  </div>
                  <span className="font-medium">{cliente.nome}</span>
                </div>
                <span className="font-bold text-status-delivered">
                  {formatCurrency(cliente.valor)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Entregas no Prazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-status-delivered">
                  {data.metricas.entregasNoPrazo}%
                </span>
                <span className="text-sm text-muted-foreground">Meta: 85%</span>
              </div>
              <Progress value={data.metricas.entregasNoPrazo} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em {data.metricas.slaSampleSize} de {data.metricas.slaTotalDelivered} entregues
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Pedidos Atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.metricas.pedidosAtrasados}
            </div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Eficiência Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  {data.metricas.eficienciaOperacional}%
                </span>
                <span className="text-sm text-muted-foreground">Score geral</span>
              </div>
              <Progress value={data.metricas.eficienciaOperacional} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;