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
import { useToast } from '@/hooks/use-toast';

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
  };
  onClose: () => void;
}

const CargoDetails: React.FC<CargoDetailsProps> = ({ cargo, onClose }) => {
  const [sosVinculadas, setSosVinculadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(cargo.status);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const availableCargoStatuses = [
    "Em Preparação",
    "Aguardando Embarque",
    "Em Trânsito",
    "Desembaraço",
    "Entregue"
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
      const { error: updateCargoError } = await supabase
        .from('cargas')
        .update({
          status: selectedStatus,
          ultima_localizacao: ultimaLocalizacao,
          updated_at: new Date().toISOString()
        })
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
      const { error: cargoHistoryError } = await supabase
        .from('carga_historico')
        .insert({
          numero_carga: cargo.numero_carga,
          evento: 'Alteração Manual de Status',
          descricao: `Status alterado de "${cargo.status}" para "${selectedStatus}" por admin`,
          localizacao: ultimaLocalizacao,
          data_evento: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (cargoHistoryError) throw cargoHistoryError;

      console.log('✅ Status da carga atualizado:', {
        carga: cargo.numero_carga,
        from: cargo.status,
        to: selectedStatus,
        sos_afetadas: soNumbers.length
      });

      toast({
        title: "Status da carga atualizado",
        description: `Status alterado de "${cargo.status}" para "${selectedStatus}". ${soNumbers.length} SOs atualizadas.`,
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
                  disabled={selectedStatus === cargo.status}
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
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Informações Gerais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        Chegada Prevista
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {formatDate(cargo.data_chegada_prevista)}
                      </div>
                      {cargo.data_chegada_prevista && (
                        <div className="text-xs text-muted-foreground">
                          {Math.ceil((new Date(cargo.data_chegada_prevista).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Thermometer className="h-4 w-4 text-primary" />
                        Status da Carga
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className="capitalize text-base font-semibold">
                        {cargo.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-2">
                        Temperatura: {cargo.tipo_temperatura || 'N/A'}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        Rota
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {cargo.origem || 'N/A'} → {cargo.destino || 'N/A'}
                      </div>
                      {cargo.transportadora && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Truck className="h-3 w-3" />
                          {cargo.transportadora}
                        </div>
                      )}
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
                                    <span className="text-sm font-semibold">{cargo.status}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    (SO: {so.status_atual})
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
              </>
            )}
          </div>
        </div>

        {/* Dialog de Confirmação */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração de status da carga</AlertDialogTitle>
              <AlertDialogDescription>
                Você está alterando o status da carga <strong>{cargo.numero_carga}</strong> de 
                <strong> "{cargo.status}"</strong> para <strong>"{selectedStatus}"</strong>.
                <br /><br />
                Todas as {sosVinculadas.length} SOs consolidadas nesta carga também serão atualizadas.
                <br /><br />
                Esta ação será registrada no histórico. Deseja continuar?
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
