import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { BarChart3, Users, Building } from 'lucide-react';
import { useChartsData } from '@/hooks/useChartsData';
import ExecutiveDashboard from './ExecutiveDashboard';
import TrendsAnalysis from './TrendsAnalysis';

const Charts: React.FC = () => {
  const { data, loading } = useChartsData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics e Relatórios</h2>
          <p className="text-muted-foreground">Análise completa de performance e tendências</p>
        </div>
      </div>

      <Tabs defaultValue="executive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="executive">Visão Geral & Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="trends">Análise de Tendências</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          <ExecutiveDashboard />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsAnalysis />
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Pedidos por Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.pedidosPorCliente.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data.pedidosPorCliente} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="cliente" type="category" className="text-xs" width={100} />
                      <Tooltip />
                      <Bar dataKey="pedidos" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum dado disponível para exibir</p>
                      <p className="text-sm">Aguarde o carregamento dos dados</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-status-delivered" />
                  Pedidos por Fornecedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.pedidosPorFornecedor.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data.pedidosPorFornecedor} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="fornecedor" type="category" className="text-xs" width={100} />
                      <Tooltip />
                      <Bar dataKey="pedidos" fill="hsl(var(--status-delivered))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum dado disponível para exibir</p>
                      <p className="text-sm">Aguarde o carregamento dos dados</p>
                    </div>
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

export default Charts;