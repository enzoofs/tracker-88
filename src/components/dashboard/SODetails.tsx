import { FC, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Package,
  Calendar,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  Edit,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Timeline from './Timeline';
import { getAlertLevel } from '@/hooks/useAlertLevel';
import { useSOTimeline } from '@/hooks/useSOTimeline';

interface SO {
  id: string;
  salesOrder: string;
  cliente: string;
  produtos: string;
  valorTotal?: number;
  statusAtual: string;
  ultimaLocalizacao: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  dataEnvio?: string;   // Data de envio FedEx
  createdAt?: string;   // Data de criação no sistema
  erpOrder?: string;
  webOrder?: string;
  trackingNumbers?: string;
  isDelivered: boolean;
}

interface SODetailsProps {
  so: SO;
  onClose: () => void;
}

interface TimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  data: string;
  dataPrevista?: string;
  status: 'completed' | 'current' | 'upcoming';
  detalhes?: string;
}

const SODetails: FC<SODetailsProps> = ({ so, onClose }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(so.statusAtual);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  
  // Usar o hook para buscar timeline real
  const { events: timelineEvents, loading: loadingTimeline } = useSOTimeline(so);

  const availableStatuses = [
    "Em Produção",
    "No Armazém",
    "Em Trânsito",
    "Em Desembaraço",
    "Entregue",
    "Atrasado",
    "Pendente"
  ];

  // Check if user is admin
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

  const handleManualStatusUpdate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Update status in envios_processados
      const { error: updateError } = await supabase
        .from('envios_processados')
        .update({
          status_atual: selectedStatus,
          status_cliente: selectedStatus,
          data_ultima_atualizacao: new Date().toISOString()
        })
        .eq('sales_order', so.salesOrder);

      if (updateError) throw updateError;

      // Insert into shipment_history
      const { error: historyError } = await supabase
        .from('shipment_history')
        .insert({
          sales_order: so.salesOrder,
          status: selectedStatus,
          location: so.ultimaLocalizacao,
          tracking_number: so.trackingNumbers || null,
          description: JSON.stringify({
            fonte: 'Alteração manual por admin',
            admin_id: user.id,
            previous_status: so.statusAtual
          }),
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      console.log('✅ Status atualizado manualmente:', {
        so: so.salesOrder,
        from: so.statusAtual,
        to: selectedStatus,
        admin: user.id
      });

      toast({
        title: "Status atualizado",
        description: `Status alterado de "${so.statusAtual}" para "${selectedStatus}"`,
      });

      setShowConfirmDialog(false);
      
      // Reload page to refresh timeline
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const alertLevel = getAlertLevel(so);

  const isArrivingToday = () => {
    // Check if any future events are scheduled for today
    return timelineEvents.some(event => {
      const eventDate = new Date(event.data);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString() && 
             event.status === 'upcoming' && 
             event.titulo.toLowerCase().includes('chegada');
    });
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="p-6 border-b bg-gradient-logistics">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl font-bold">SO {so.salesOrder}</DialogTitle>
                <p className="text-sm text-muted-foreground">{so.cliente}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <div className="flex items-center gap-2 border-r pr-3">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Alterar status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status} className="text-xs">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={selectedStatus === so.statusAtual}
                    className="h-8 gap-2"
                  >
                    <Edit className="h-3 w-3" />
                    Atualizar
                  </Button>
                </div>
              )}

              {alertLevel && (
                <Badge variant={alertLevel.color as any}>
                  {alertLevel.message}
                </Badge>
              )}

              {isArrivingToday() && (
                <Badge className="bg-status-production text-status-production-foreground">
                  CHEGADA HOJE
                </Badge>
              )}

              {so.isDelivered && (
                <Badge className="bg-status-delivered text-status-delivered-foreground">
                  ENTREGUE
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* SO Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-primary" />
                    Status Atual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-status-transit text-status-transit-foreground">
                    {so.statusAtual}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-status-shipping" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">
                    {so.ultimaLocalizacao || 'Não informado'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {new Date(
                      so.statusAtual === 'Em Produção' && so.dataOrdem 
                        ? so.dataOrdem 
                        : so.dataUltimaAtualizacao
                    ).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-status-delivered" />
                    Pedidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    <p><span className="font-medium">SAP SO:</span> {so.erpOrder || 'N/A'}</p>
                    <p><span className="font-medium">WO:</span> {so.webOrder || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className="text-base">🔖</span>
                    Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-mono break-all">
                    {so.trackingNumbers || 'Não disponível'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Products and Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Produtos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{so.produtos}</p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {so.valorTotal ? `R$ ${Number(so.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Timeline */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Timeline de Acompanhamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTimeline ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : timelineEvents.length > 0 ? (
                  <Timeline events={timelineEvents} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento de rastreamento encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>

      {/* Confirmation Dialog for Manual Status Update */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar manualmente o status da SO <strong>{so.salesOrder}</strong> de
              <strong> "{so.statusAtual}"</strong> para <strong>"{selectedStatus}"</strong>.
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
    </Dialog>
  );
};

export default SODetails;