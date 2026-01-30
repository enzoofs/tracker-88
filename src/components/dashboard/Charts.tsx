import { FC, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useChartsData } from '@/hooks/useChartsData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ExecutiveDashboard from './ExecutiveDashboard';
import TrendsAnalysis from './TrendsAnalysis';
import DataAuditPanel from './DataAuditPanel';
import type { AuditIndicator, AuditData } from '@/hooks/useAuditData';

const Charts: FC = () => {
  const { data, loading } = useChartsData();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const handleGenerateReport = useCallback(async (indicators: AuditIndicator[], summary: AuditData['summary']) => {
    setIsGenerating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-report', {
        body: {
          indicators: indicators.map(ind => ({
            name: ind.name,
            value: ind.value,
            formula: ind.formula,
            sampleSize: ind.sampleSize,
            totalEligible: ind.totalEligible,
            coveragePercent: ind.coveragePercent,
            missingDataRecords: ind.missingDataRecords?.length || 0
          })),
          summary
        }
      });

      if (error) throw error;

      setReportContent(result.report);
      setReportDialogOpen(true);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: error.message || 'Não foi possível gerar o relatório. Verifique se a OPENAI_API_KEY está configurada no Supabase.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const handleCopyReport = () => {
    if (reportContent) {
      navigator.clipboard.writeText(reportContent);
      toast({ title: 'Relatório copiado!' });
    }
  };

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
          <TabsTrigger value="executive">Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="audit">Auditoria de Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          <ExecutiveDashboard />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendsAnalysis />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <DataAuditPanel
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGenerating}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Relatório de Análise IA
              <Button variant="outline" size="sm" onClick={handleCopyReport}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-4">
              {reportContent}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Charts;
