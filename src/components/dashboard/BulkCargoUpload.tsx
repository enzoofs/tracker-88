import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';

interface CargoRow {
  numero_carga: string;
  data_embarque?: string;
  data_chegada?: string;
  data_desembaraco?: string;
  data_entrega?: string;
  status?: string;
}

interface ValidationResult {
  row: CargoRow;
  rowIndex: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  exists: boolean;
}

interface ProcessingResult {
  success: boolean;
  numero_carga: string;
  message: string;
  sos_updated: number;
}

interface BulkCargoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BulkCargoUpload: React.FC<BulkCargoUploadProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CargoRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'results'>('upload');
  const { toast } = useToast();

  // Parse date from DD/MM/YYYY format to ISO string
  const parseDate = (dateStr: string | undefined): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Handle Excel serial date numbers
    if (typeof dateStr === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + dateStr * 86400000);
      return date.toISOString();
    }
    
    const str = String(dateStr).trim();
    
    // Try DD/MM/YYYY format
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const fullYear = year < 100 ? 2000 + year : year;
      const date = new Date(fullYear, month, day, 12, 0, 0);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // Try ISO format
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString();
    }
    
    return null;
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    const parsed = parseDate(dateStr);
    if (!parsed) return dateStr;
    return new Date(parsed).toLocaleDateString('pt-BR');
  };

  // Download template Excel file
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        numero_carga: '892',
        data_embarque: '15/10/2025',
        data_chegada: '16/10/2025',
        data_desembaraco: '18/10/2025',
        data_entrega: '20/10/2025',
        status: 'Entregue'
      },
      {
        numero_carga: '903',
        data_embarque: '27/11/2025',
        data_chegada: '28/11/2025',
        data_desembaraco: '',
        data_entrega: '01/12/2025',
        status: 'Entregue'
      },
      {
        numero_carga: '911',
        data_embarque: '',
        data_chegada: '',
        data_desembaraco: '',
        data_entrega: '',
        status: 'Em Consolidação'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // numero_carga
      { wch: 15 }, // data_embarque
      { wch: 15 }, // data_chegada
      { wch: 18 }, // data_desembaraco
      { wch: 15 }, // data_entrega
      { wch: 20 }, // status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Cargas');
    XLSX.writeFile(wb, 'template-importacao-cargas.xlsx');
    
    toast({
      title: 'Template baixado',
      description: 'Preencha a planilha conforme o modelo e faça o upload.',
    });
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsValidating(true);

    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<CargoRow>(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: 'Planilha vazia',
          description: 'A planilha não contém dados para processar.',
          variant: 'destructive',
        });
        setIsValidating(false);
        return;
      }

      setParsedData(jsonData);

      // Validate each row
      const cargoNumbers = jsonData.map(row => String(row.numero_carga || '').trim()).filter(Boolean);
      
      // Check which cargas exist in database
      const { data: existingCargas, error } = await supabase
        .from('cargas')
        .select('numero_carga')
        .in('numero_carga', cargoNumbers);

      if (error) throw error;

      const existingSet = new Set(existingCargas?.map(c => c.numero_carga) || []);

      const results: ValidationResult[] = jsonData.map((row, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const numeroCarga = String(row.numero_carga || '').trim();
        
        // Check required field
        if (!numeroCarga) {
          errors.push('numero_carga é obrigatório');
        }

        // Check if cargo exists
        const exists = existingSet.has(numeroCarga);
        if (numeroCarga && !exists) {
          errors.push(`Carga "${numeroCarga}" não existe no sistema`);
        }

        // Validate date formats
        const dates = [
          { field: 'data_embarque', value: row.data_embarque },
          { field: 'data_chegada', value: row.data_chegada },
          { field: 'data_desembaraco', value: row.data_desembaraco },
          { field: 'data_entrega', value: row.data_entrega },
        ];

        const parsedDates: (Date | null)[] = [];
        
        dates.forEach(({ field, value }) => {
          if (value && String(value).trim() !== '') {
            const parsed = parseDate(String(value));
            if (!parsed) {
              errors.push(`${field}: formato inválido (use DD/MM/AAAA)`);
              parsedDates.push(null);
            } else {
              parsedDates.push(new Date(parsed));
            }
          } else {
            parsedDates.push(null);
          }
        });

        // Check chronological order
        const validDates = parsedDates.filter((d): d is Date => d !== null);
        for (let i = 1; i < validDates.length; i++) {
          if (validDates[i] < validDates[i - 1]) {
            warnings.push('Datas fora de ordem cronológica');
            break;
          }
        }

        return {
          row,
          rowIndex: index + 2, // +2 for header row and 1-indexed
          isValid: errors.length === 0,
          errors,
          warnings,
          exists,
        };
      });

      setValidationResults(results);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível processar a planilha.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  }, [toast]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      handleFileUpload(droppedFile);
    } else {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie um arquivo Excel (.xlsx ou .xls)',
        variant: 'destructive',
      });
    }
  }, [handleFileUpload, toast]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Process the data
  const handleProcess = async () => {
    const validRows = validationResults.filter(v => v.isValid);
    
    if (validRows.length === 0) {
      toast({
        title: 'Nenhum dado válido',
        description: 'Corrija os erros na planilha antes de processar.',
        variant: 'destructive',
      });
      return;
    }

    setStep('processing');
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingResults([]);

    const results: ProcessingResult[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const { row } = validRows[i];
      
      try {
        const response = await supabase.functions.invoke('bulk-update-cargas', {
          body: {
            cargas: [{
              numero_carga: String(row.numero_carga).trim(),
              data_embarque: parseDate(row.data_embarque),
              data_chegada: parseDate(row.data_chegada),
              data_desembaraco: parseDate(row.data_desembaraco),
              data_entrega: parseDate(row.data_entrega),
              status: row.status?.trim() || null,
            }]
          }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        results.push({
          success: data.results?.[0]?.success ?? true,
          numero_carga: String(row.numero_carga),
          message: data.results?.[0]?.message || 'Atualizado com sucesso',
          sos_updated: data.results?.[0]?.sos_updated || 0,
        });
      } catch (error: any) {
        results.push({
          success: false,
          numero_carga: String(row.numero_carga),
          message: error.message || 'Erro ao processar',
          sos_updated: 0,
        });
      }

      setProcessingProgress(Math.round(((i + 1) / validRows.length) * 100));
      setProcessingResults([...results]);
    }

    setIsProcessing(false);
    setStep('results');
    
    const successCount = results.filter(r => r.success).length;
    const totalSOs = results.reduce((sum, r) => sum + r.sos_updated, 0);
    
    toast({
      title: 'Processamento concluído',
      description: `${successCount}/${results.length} cargas atualizadas. ${totalSOs} SOs afetadas.`,
    });

    if (onSuccess) {
      onSuccess();
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const valid = validationResults.filter(v => v.isValid).length;
    const withErrors = validationResults.filter(v => !v.isValid).length;
    const withWarnings = validationResults.filter(v => v.isValid && v.warnings.length > 0).length;
    return { valid, withErrors, withWarnings, total: validationResults.length };
  }, [validationResults]);

  // Reset state
  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setProcessingResults([]);
    setStep('upload');
    setProcessingProgress(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Planilha de Cargas
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel com datas de eventos para atualizar múltiplas cargas de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              {/* Download Template */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Baixar template de exemplo</p>
                  <p className="text-sm text-muted-foreground">
                    Use o modelo para preencher os dados corretamente
                  </p>
                </div>
                <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {isValidating ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <p className="text-muted-foreground">Validando planilha...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Arraste e solte sua planilha aqui</p>
                      <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: .xlsx, .xls
                    </p>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-medium mb-3">Instruções de preenchimento:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• <strong>numero_carga</strong>: Obrigatório. Deve existir no sistema.</li>
                    <li>• <strong>data_embarque</strong>: Data de saída do voo (DD/MM/AAAA)</li>
                    <li>• <strong>data_chegada</strong>: Data de chegada no Brasil (DD/MM/AAAA)</li>
                    <li>• <strong>data_desembaraco</strong>: Data de liberação alfandegária (DD/MM/AAAA)</li>
                    <li>• <strong>data_entrega</strong>: Data de entrega final (DD/MM/AAAA)</li>
                    <li>• <strong>status</strong>: Opcional. Se não informado, será calculado pela última data.</li>
                    <li className="text-amber-600 dark:text-amber-400">⚠️ Células preenchidas sobrescrevem dados existentes!</li>
                    <li className="text-muted-foreground">Células vazias mantêm o valor atual (não apagam).</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-4 py-4">
              {/* Stats */}
              <div className="flex gap-4">
                <Badge variant="outline" className="gap-2 px-3 py-1">
                  <span className="font-normal">Total:</span> {stats.total}
                </Badge>
                <Badge className="gap-2 px-3 py-1 bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-3 w-3" />
                  Válidos: {stats.valid}
                </Badge>
                {stats.withErrors > 0 && (
                  <Badge className="gap-2 px-3 py-1 bg-destructive/10 text-destructive border-destructive/20">
                    <AlertCircle className="h-3 w-3" />
                    Com erros: {stats.withErrors}
                  </Badge>
                )}
                {stats.withWarnings > 0 && (
                  <Badge className="gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <AlertTriangle className="h-3 w-3" />
                    Com avisos: {stats.withWarnings}
                  </Badge>
                )}
              </div>

              {/* Data Table */}
              <ScrollArea className="h-[400px] rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Nº Carga</TableHead>
                      <TableHead>Embarque</TableHead>
                      <TableHead>Chegada</TableHead>
                      <TableHead>Desembaraço</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result, index) => (
                      <TableRow key={index} className={!result.isValid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {result.isValid ? (
                            result.warnings.length > 0 ? (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{result.row.numero_carga}</TableCell>
                        <TableCell>{formatDateDisplay(result.row.data_embarque)}</TableCell>
                        <TableCell>{formatDateDisplay(result.row.data_chegada)}</TableCell>
                        <TableCell>{formatDateDisplay(result.row.data_desembaraco)}</TableCell>
                        <TableCell>{formatDateDisplay(result.row.data_entrega)}</TableCell>
                        <TableCell>{result.row.status || '-'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {result.errors.map((err, i) => (
                              <p key={i} className="text-xs text-destructive">{err}</p>
                            ))}
                            {result.warnings.map((warn, i) => (
                              <p key={i} className="text-xs text-amber-600">{warn}</p>
                            ))}
                            {result.isValid && result.warnings.length === 0 && (
                              <p className="text-xs text-green-600">OK</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium">Processando cargas...</p>
                <p className="text-muted-foreground">
                  {processingResults.length} de {stats.valid} processadas
                </p>
              </div>
              <Progress value={processingProgress} className="h-2" />
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && (
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {processingResults.filter(r => r.success).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Cargas atualizadas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-destructive">
                      {processingResults.filter(r => !r.success).length}
                    </p>
                    <p className="text-sm text-muted-foreground">Com erro</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {processingResults.reduce((sum, r) => sum + r.sos_updated, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">SOs afetadas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Results Table */}
              <ScrollArea className="h-[300px] rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Status</TableHead>
                      <TableHead>Nº Carga</TableHead>
                      <TableHead>SOs Afetadas</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processingResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{result.numero_carga}</TableCell>
                        <TableCell>{result.sos_updated}</TableCell>
                        <TableCell className={result.success ? '' : 'text-destructive'}>
                          {result.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Voltar
              </Button>
              <Button 
                onClick={handleProcess} 
                disabled={stats.valid === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Processar {stats.valid} cargas
              </Button>
            </>
          )}
          
          {step === 'results' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Nova importação
              </Button>
              <Button onClick={handleClose}>
                Concluir
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkCargoUpload;
