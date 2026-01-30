import { FC, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  FileText,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuditData, AuditIndicator, AuditSORecord, AuditData } from '@/hooks/useAuditData';
import { formatCurrency } from '@/lib/formatters';

interface DataAuditPanelProps {
  onGenerateReport?: (indicators: AuditIndicator[], summary: AuditData['summary']) => void;
  isGeneratingReport?: boolean;
}

const DataAuditPanel: FC<DataAuditPanelProps> = ({
  onGenerateReport,
  isGeneratingReport = false
}) => {
  const { indicators, summary, loading, refresh } = useAuditData();
  const [selectedIndicator, setSelectedIndicator] = useState<AuditIndicator | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [missingDataDialogOpen, setMissingDataDialogOpen] = useState(false);

  const getCoverageBadgeColor = (percent: number): string => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleIndicatorClick = (indicator: AuditIndicator) => {
    setSelectedIndicator(indicator);
    setDialogOpen(true);
  };

  const handleMissingDataClick = () => {
    setMissingDataDialogOpen(true);
  };

  const allMissingDataRecords = indicators.flatMap(ind => ind.missingDataRecords);
  const uniqueMissingDataRecords = Array.from(
    new Map(allMissingDataRecords.map(r => [r.salesOrder, r])).values()
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Auditoria de Dados</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {onGenerateReport && (
            <Button
              size="sm"
              onClick={() => onGenerateReport(indicators, summary)}
              disabled={isGeneratingReport}
            >
              <Sparkles className={`h-4 w-4 mr-2 ${isGeneratingReport ? 'animate-pulse' : ''}`} />
              Gerar Análise IA
            </Button>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total SOs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSOs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entregues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalDelivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com data_envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.withDataEnvio}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com data_entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.withDataEntrega}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cobertura Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{summary.coveragePercent}%</div>
              <Badge className={getCoverageBadgeColor(summary.coveragePercent)}>
                {summary.withBothDates} de {summary.totalDelivered}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-2 gap-4">
        {indicators.map((indicator, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleIndicatorClick(indicator)}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{indicator.name}</span>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">{indicator.value}</div>
              <div className="text-sm text-muted-foreground">
                {indicator.formula}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm">
                  <span className="font-medium">Cobertura:</span>{' '}
                  <span className="text-muted-foreground">
                    {indicator.sampleSize} de {indicator.totalEligible} pedidos
                  </span>
                </div>
                <Badge className={getCoverageBadgeColor(indicator.coveragePercent)}>
                  {indicator.coveragePercent}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Missing Data Section */}
      {uniqueMissingDataRecords.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Dados Faltantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-orange-700">
                {uniqueMissingDataRecords.length} pedidos com campos críticos faltantes
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMissingDataClick}
                className="border-orange-300 hover:bg-orange-100"
              >
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicator Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedIndicator?.name}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="records" className="w-full">
            <TabsList>
              <TabsTrigger value="records">
                Pedidos Utilizados ({selectedIndicator?.records.length || 0})
              </TabsTrigger>
              {selectedIndicator && selectedIndicator.missingDataRecords.length > 0 && (
                <TabsTrigger value="missing">
                  Dados Faltantes ({selectedIndicator.missingDataRecords.length})
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="records">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SO</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead>Data Entrega</TableHead>
                      <TableHead>Dias Úteis</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedIndicator?.records.map((record) => (
                      <TableRow key={record.salesOrder}>
                        <TableCell className="font-medium">{record.salesOrder}</TableCell>
                        <TableCell>{record.cliente}</TableCell>
                        <TableCell>
                          {record.dataEnvio
                            ? new Date(record.dataEnvio).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {record.dataEntrega
                            ? new Date(record.dataEntrega).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>{record.businessDays ?? '-'}</TableCell>
                        <TableCell>
                          {record.onTime === true && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              No Prazo
                            </Badge>
                          )}
                          {record.onTime === false && (
                            <Badge className="bg-red-500">
                              <XCircle className="h-3 w-3 mr-1" />
                              Atrasado
                            </Badge>
                          )}
                          {record.onTime === null && (
                            <Badge variant="secondary">{record.statusAtual}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            {selectedIndicator && selectedIndicator.missingDataRecords.length > 0 && (
              <TabsContent value="missing">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SO</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Campos Faltantes</TableHead>
                        <TableHead>Status Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedIndicator.missingDataRecords.map((record) => (
                        <TableRow key={record.salesOrder}>
                          <TableCell className="font-medium">{record.salesOrder}</TableCell>
                          <TableCell>{record.cliente}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {record.missingFields.map((field) => (
                                <Badge key={field} variant="destructive" className="text-xs">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{record.statusAtual}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Missing Data Dialog */}
      <Dialog open={missingDataDialogOpen} onOpenChange={setMissingDataDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Pedidos com Dados Faltantes
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Campos Faltantes</TableHead>
                  <TableHead>Status Atual</TableHead>
                  <TableHead>Entregue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueMissingDataRecords.map((record) => (
                  <TableRow key={record.salesOrder}>
                    <TableCell className="font-medium">{record.salesOrder}</TableCell>
                    <TableCell>{record.cliente}</TableCell>
                    <TableCell>{formatCurrency(record.valorTotal)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {record.missingFields.map((field) => (
                          <Badge key={field} variant="destructive" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.statusAtual}</Badge>
                    </TableCell>
                    <TableCell>
                      {record.isDelivered ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataAuditPanel;
