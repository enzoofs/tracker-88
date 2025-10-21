import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, Users, Building } from 'lucide-react';
import { useChartsData } from '@/hooks/useChartsData';
import ExecutiveDashboard from './ExecutiveDashboard';
import TrendsAnalysis from './TrendsAnalysis';

const Charts: React.FC = () => {
  const { data, loading } = useChartsData();

  // Definir cores específicas por status
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'No Armazém': 'hsl(210, 100%, 56%)',           // Azul vibrante
      'Chegada no Brasil': 'hsl(142, 76%, 36%)',     // Verde escuro
      'On FedEx vehicle for delivery': 'hsl(45, 100%, 51%)',  // Amarelo/laranja
      'Em Veículo FedEx': 'hsl(45, 100%, 51%)',      // Amarelo/laranja
      'Desembaraço': 'hsl(25, 95%, 53%)',            // Laranja
      'Em Produção': 'hsl(262, 83%, 58%)',           // Roxo
      'Voo Internacional': 'hsl(195, 100%, 50%)',    // Ciano
      'Em Importação': 'hsl(330, 100%, 45%)',        // Rosa/magenta
      'Entregue': 'hsl(120, 100%, 25%)',             // Verde muito escuro
    };
    
    return colorMap[status] || `hsl(${Math.random() * 360}, 70%, 50%)`;
  };

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
        <TabsList className="grid w-full grid-cols-3 max-w-4xl mx-auto">
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
          <div className="flex justify-center">
            <Card className="shadow-card w-full max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                  Status dos Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        dataKey="quantidade"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ status, quantidade }) => `${status}: ${quantidade}`}
                      >
                        {data.statusDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getStatusColor(entry.status)} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
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