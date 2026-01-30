import { FC } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChartsData } from '@/hooks/useChartsData';
import ExecutiveDashboard from './ExecutiveDashboard';
import TrendsAnalysis from './TrendsAnalysis';

const Charts: FC = () => {
  const { data, loading } = useChartsData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics e Relatórios</h2>
          <p className="text-muted-foreground">Análise completa de performance e tendências</p>
        </div>
      </div>

      <Tabs defaultValue="executive" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-4xl mx-auto">
          <TabsTrigger value="executive">Visão Geral & Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="trends">Análise de Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          <ExecutiveDashboard />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Charts;