import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plane, 
  Package, 
  Calendar, 
  MapPin, 
  Thermometer,
  Truck,
  CheckCircle,
  X,
  Loader2,
  Edit
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { translateFedExStatus } from '@/lib/utils';

interface CargoDetailsProps {
  cargo: {
    id: string;
    numero_carga: string;
    mawb?: string;
    hawb?: string;
    status: string;
    origem?: string;
    destino?: string;
    data_chegada_prevista?: string;
    tipo_temperatura?: string;
    transportadora?: string;
    observacoes?: string;
  };
  onClose: () => void;
}

const CargoDetails: React.FC<CargoDetailsProps> = ({ cargo, onClose }) => {
  const [sosVinculadas, setSosVinculadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(cargo.status);
  const [selectedTemperatura, setSelectedTemperatura] = useState(cargo.tipo_temperatura || '');
  const [selectedDataChegada, setSelectedDataChegada] = useState(
    cargo.data_chegada_prevista ? new Date(cargo.data_chegada_prevista).toISOString().split('T')[0] : ''
  );
  const [observacoes, setObservacoes] = useState(cargo.observacoes || '');
  const [isSavingObservacoes, setIsSavingObservacoes] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const availableCargoStatuses = [
    "Em Preparação",
    "Aguardando Embarque",
    "Em Trânsito",
    "Em Desembaraço",
    "Entregue"
  ];

  const temperatureTypes = [
    "Ambiente",
    "Refrigerado (2-8°C)",
    "Congelado (-20°C)",
    "Controlado (15-25°C)"
  ];

  useEffect(() => {
    loadCargoDetails();
  }, [cargo.numero_carga]);

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });
        
        if (error) throw error;
        setIsAdmin(data === true);
      } catch (error) {
        console.error('Error checking admin role:', error);
      }
    };

    checkAdminRole();
  }, []);

  const loadCargoDetails = async () => {
    try {
      setLoading(true);

      // Buscar SOs vinculadas
      const { data: linkedSOs, error: soError } = await supabase
        .from('carga_sales_orders')
        .select('so_number')
        .eq('numero_carga', cargo.numero_carga);

      if (soError) throw soError;

      const soNumbers = linkedSOs?.map(link => link.so_number) || [];

      if (soNumbers.length > 0) {
        const { data: sosData, error: sosError } = await supabase
          .from('envios_processados')
          .select('*')
          .in('sales_order', soNumbers);

        if (sosError) throw sosError;
        setSosVinculadas(sosData || []);
      }

    } catch (error) {
      console.error('Erro ao carregar detalhes da carga:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'em trânsito':
        return <Truck className="h-4 w-4 text-yellow-500" />;
      case 'entregue':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Plane className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTotalValue = () => {
    return sosVinculadas.reduce((sum, so) => sum + (so.valor_total || 0), 0);
  };

  const handleSaveObservacoes = async () => {
    try {
      setIsSavingObservacoes(true);
      
      const { error } = await supabase
        .from('cargas')
        .update({ observacoes })
        .eq('numero_carga', cargo.numero_carga);

      if (error) throw error;

      toast({
        title: "Observações salvas",
        description: "As observações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving observacoes:', error);
      toast({
        title: "Erro ao salvar observações",
        description: "Não foi possível salvar as observações.",
        variant: "destructive"
      });
    } finally {
      setIsSavingObservacoes(false);
    }
  };

  const handleManualStatusUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Buscar SOs vinculadas
      const { data: linkedSOs, error: soError } = await supabase
        .from('carga_sales_orders')
        .select('so_number')
        .eq('numero_carga', cargo.numero_carga);

      if (soError) throw soError;

      const soNumbers = linkedSOs?.map(link => link.so_number) || [];

      // 2. Determinar ultima_localizacao baseado no status
      let ultimaLocalizacao = '';
      const statusLower = selectedStatus.toLowerCase();
      if (statusLower.includes('preparação')) {
        ultimaLocalizacao = 'Origem';
      } else if (statusLower.includes('embarque')) {
        ultimaLocalizacao = 'Aeroporto de Origem';
      } else if (statusLower.includes('trânsito')) {
        ultimaLocalizacao = 'Em Voo';
      } else if (statusLower.includes('desembaraço')) {
        ultimaLocalizacao = 'Alfândega Brasil';
      } else if (statusLower.includes('entregue')) {
        ultimaLocalizacao = 'Destino Final';
      }

      // 3. Atualizar a carga
      const cargoUpdate: any = {
        status: selectedStatus,
        ultima_localizacao: ultimaLocalizacao,
        updated_at: new Date().toISOString()
      };

      if (selectedTemperatura) {
        cargoUpdate.tipo_temperatura = selectedTemperatura;
      }

      if (selectedDataChegada) {
        cargoUpdate.data_chegada_prevista = new Date(selectedDataChegada).toISOString();
      }

      const { error: updateCargoError } = await supabase
        .from('cargas')
        .update(cargoUpdate)
        .eq('numero_carga', cargo.numero_carga);

      if (updateCargoError) throw updateCargoError;

      // 4. Atualizar SOs vinculadas
      if (soNumbers.length > 0) {
        const { error: updateSOsError } = await supabase
          .from('envios_processados')
          .update({
            status_atual: selectedStatus,
            status_cliente: selectedStatus,
            ultima_localizacao: ultimaLocalizacao,
            data_ultima_atualizacao: new Date().toISOString()
          })
          .in('sales_order', soNumbers);

        if (updateSOsError) throw updateSOsError;

        // 5. Inserir histórico para cada SO
        const historyRecords = soNumbers.map(so => ({
          sales_order: so,
          status: selectedStatus,
          location: ultimaLocalizacao,
          description: JSON.stringify({
            fonte: 'Alteração manual de carga por admin',
            admin_id: user.id,
            numero_carga: cargo.numero_carga,
            previous_status: cargo.status
          }),
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        }));

        const { error: historyError } = await supabase
          .from('shipment_history')
          .insert(historyRecords);

        if (historyError) throw historyError;
      }

      // 6. Inserir histórico da carga
      const descricaoPartes = [];
      if (selectedStatus !== cargo.status) {
        descricaoPartes.push(`Status: "${cargo.status}" → "${selectedStatus}"`);
      }
      if (selectedTemperatura && selectedTemperatura !== cargo.tipo_temperatura) {
        descricaoPartes.push(`Temperatura: "${cargo.tipo_temperatura || 'N/A'}" → "${selectedTemperatura}"`);
      }
      if (selectedDataChegada && selectedDataChegada !== (cargo.data_chegada_prevista ? new Date(cargo.data_chegada_prevista).toISOString().split('T')[0] : '')) {
        descricaoPartes.push(`Chegada prevista: "${cargo.data_chegada_prevista ? new Date(cargo.data_chegada_prevista).toLocaleDateString('pt-BR') : 'N/A'}" → "${new Date(selectedDataChegada).toLocaleDateString('pt-BR')}"`);
      }

      const { error: cargoHistoryError } = await supabase
        .from('carga_historico')
        .insert({
          numero_carga: cargo.numero_carga,
          evento: 'Alteração Manual de Carga',
          descricao: `Alterações feitas por admin: ${descricaoPartes.join('; ')}`,
          localizacao: ultimaLocalizacao,
          data_evento: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (cargoHistoryError) throw cargoHistoryError;

      console.log('✅ Carga atualizada:', {
        carga: cargo.numero_carga,
        status_from: cargo.status,
        status_to: selectedStatus,
        temperatura: selectedTemperatura,
        data_chegada: selectedDataChegada,
        sos_afetadas: soNumbers.length
      });

      toast({
        title: "Carga atualizada com sucesso",
        description: `Informações da carga ${cargo.numero_carga} atualizadas. ${soNumbers.length} SOs atualizadas.`,
      });

      setShowConfirmDialog(false);
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error updating cargo status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da carga.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Carga {cargo.numero_carga}</h2>
              <p className="text-sm text-muted-foreground">
                {cargo.mawb && `MAWB: ${cargo.mawb}`} {cargo.hawb && cargo.mawb && '|'} {cargo.hawb && `HAWB: ${cargo.hawb}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-2 border-r pr-3 mr-3">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Alterar status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCargoStatuses.map((status) => (
                      <SelectItem key={status} value={status} className="text-xs">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={
                    selectedStatus === cargo.status && 
                    selectedTemperatura === (cargo.tipo_temperatura || '') &&
                    selectedDataChegada === (cargo.data_chegada_prevista ? new Date(cargo.data_chegada_prevista).toISOString().split('T')[0] : '')
                  }
                  className="h-8 gap-2"
                >
                  <Edit className="h-3 w-3" />
                  Atualizar
                </Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="observacoes">Observações</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  {/* Informações Gerais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-primary" />
                          Chegada Prevista
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {isAdmin ? (
                          <div className="space-y-2">
                            <Input
                              type="date"
                              value={selectedDataChegada}
                              onChange={(e) => setSelectedDataChegada(e.target.value)}
                              className="h-9"
                            />
                            {selectedDataChegada && (
                              <div className="text-xs text-muted-foreground">
                                {Math.ceil((new Date(selectedDataChegada).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-medium">
                              {formatDate(cargo.data_chegada_prevista)}
                            </div>
                            {cargo.data_chegada_prevista && (
                              <div className="text-xs text-muted-foreground">
                                {Math.ceil((new Date(cargo.data_chegada_prevista).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Thermometer className="h-4 w-4 text-primary" />
                          Condições
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Badge className="capitalize text-base font-semibold">
                          {cargo.status}
                        </Badge>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1">Temperatura</Label>
                          {isAdmin ? (
                            <Select value={selectedTemperatura} onValueChange={setSelectedTemperatura}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {temperatureTypes.map((temp) => (
                                  <SelectItem key={temp} value={temp}>
                                    {temp}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm font-medium">
                              {cargo.tipo_temperatura || 'N/A'}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* SOs Consolidadas */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          Sales Orders Consolidadas ({sosVinculadas.length})
                        </CardTitle>
                        <div className="text-sm font-medium">
                          Total: R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {sosVinculadas.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SO</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Produtos</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Tracking</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sosVinculadas.map((so) => (
                              <TableRow key={so.id}>
                                <TableCell className="font-medium">{so.sales_order}</TableCell>
                                <TableCell>{so.cliente}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {typeof so.produtos === 'string' ? so.produtos : JSON.stringify(so.produtos)}
                                </TableCell>
                                <TableCell>
                                  R$ {(so.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(cargo.status)}
                                      <span className="text-sm font-semibold">{translateFedExStatus(cargo.status)}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      (SO: {translateFedExStatus(so.status_atual)})
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-mono">
                                  {so.tracking_numbers || 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          Nenhuma SO vinculada a esta carga
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="observacoes" className="space-y-4">
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Observações da Carga</span>
                        {isAdmin && (
                          <Button 
                            size="sm" 
                            onClick={handleSaveObservacoes}
                            disabled={isSavingObservacoes || observacoes === (cargo.observacoes || '')}
                          >
                            {isSavingObservacoes ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              'Salvar'
                            )}
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isAdmin ? (
                        <Textarea
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          placeholder="Digite observações sobre esta carga..."
                          className="min-h-[200px] resize-y"
                        />
                      ) : (
                        <div className="min-h-[200px] p-4 rounded-md border bg-muted/30 text-sm">
                          {cargo.observacoes || 'Nenhuma observação registrada.'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Dialog de Confirmação */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Atualizar informações da carga</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <div>
                  Você está atualizando as informações da carga <strong>{cargo.numero_carga}</strong>.
                  {sosVinculadas.length > 0 && (
                    <>
                      <br />
                      Todas as {sosVinculadas.length} SOs consolidadas nesta carga também serão atualizadas com o novo status.
                    </>
                  )}
                </div>

                <div className="text-xs text-muted-foreground pt-2">
                  Esta ação será registrada no histórico.
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleManualStatusUpdate}>
                Confirmar Alteração
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default CargoDetails;
