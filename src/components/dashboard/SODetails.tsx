import React, { useState, useEffect } from 'react';
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
  X, 
  Package, 
  Calendar,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Timeline from './Timeline';
import { getAlertLevel } from '@/hooks/useAlertLevel';

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
  erpOrder?: string;
  webOrder?: string;
  trackingNumbers?: string;
  isDelivered: boolean;
}

interface SODetailsProps {
  so: SO;
  onClose: () => void;
}

const SODetails: React.FC<SODetailsProps> = ({ so, onClose }) => {
  const [shipmentHistory, setShipmentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(so.statusAtual);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const availableStatuses = [
    "Em Produção",
    "Enviado",
    "Em Importação",
    "No Armazém",
    "Em Trânsito",
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
      
      // Reload history and close after a delay
      setTimeout(() => {
        loadShipmentHistory();
        onClose();
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

  const loadShipmentHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipment_history')
        .select('*')
        .eq('sales_order', so.salesOrder)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      
      // Se não houver histórico, criar eventos sintéticos baseados no status atual
      if (!data || data.length === 0) {
        const syntheticEvents = createSyntheticEvents(so.statusAtual, so.dataUltimaAtualizacao);
        setShipmentHistory(syntheticEvents);
      } else {
        setShipmentHistory(data);
      }
    } catch (error) {
      console.error('Error loading shipment history:', error);
      // Criar eventos sintéticos em caso de erro
      const syntheticEvents = createSyntheticEvents(so.statusAtual, so.dataUltimaAtualizacao);
      setShipmentHistory(syntheticEvents);
    } finally {
      setLoading(false);
    }
  };

  const createSyntheticEvents = (statusAtual: string, dataAtualizacao: string) => {
    const events = [];
    const now = new Date(dataAtualizacao);
    const statusLower = statusAtual.toLowerCase().trim();
    
    console.log('🔍 createSyntheticEvents - statusAtual:', statusAtual);
    
    // Definir a ordem dos estágios e qual é o atual
    const stageOrder = [
      'em produção',
      'fedex',
      'no armazém',
      'embarque agendado',
      'embarque confirmado',
      'chegada no brasil',
      'desembaraço',
      'entregue'
    ];
    
    // Encontrar o índice do estágio atual
    let currentStageIndex = -1;
    for (let i = 0; i < stageOrder.length; i++) {
      const stage = stageOrder[i];
      if (stage === 'no armazém' && (statusLower.includes('armazém') || statusLower.includes('armazem'))) {
        currentStageIndex = i;
        break;
      } else if (stage === 'em produção' && statusLower.includes('produção')) {
        currentStageIndex = i;
        break;
      } else if (stage === 'chegada no brasil' && (statusLower.includes('chegada') || statusLower.includes('brasil'))) {
        currentStageIndex = i;
        break;
      } else if (stage === 'desembaraço' && (statusLower.includes('desembaraço') || statusLower.includes('desembaraco'))) {
        currentStageIndex = i;
        break;
      } else if (statusLower.includes(stage)) {
        currentStageIndex = i;
        break;
      }
    }
    
    console.log('📊 Estágio atual detectado:', stageOrder[currentStageIndex], '(índice:', currentStageIndex + ')');
    
    // Se não encontrou o estágio, considerar que está em produção
    if (currentStageIndex === -1) {
      currentStageIndex = 0;
    }
    
    // Sempre adiciona "Em Produção" como primeiro evento
    const producaoDate = so.dataOrdem ? new Date(so.dataOrdem) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    events.push({
      id: 'synthetic-producao',
      sales_order: so.salesOrder,
      status: 'Em Produção',
      event_status: currentStageIndex === 0 ? 'current' : 'completed',
      description: 'Produto em fabricação',
      location: 'Fornecedor',
      timestamp: producaoDate.toISOString()
    });
    
    // FedEx (se já passou desse estágio)
    if (currentStageIndex >= 1) {
      events.push({
        id: 'synthetic-fedex',
        sales_order: so.salesOrder,
        status: 'FedEx',
        event_status: currentStageIndex === 1 ? 'current' : 'completed',
        description: 'Em trânsito para o armazém',
        location: 'Em trânsito',
        timestamp: new Date(producaoDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // No Armazém (se já passou desse estágio)
    if (currentStageIndex >= 2) {
      const fedexDate = events[events.length - 1]?.timestamp || producaoDate.toISOString();
      events.push({
        id: 'synthetic-armazem',
        sales_order: so.salesOrder,
        status: 'No Armazém',
        event_status: currentStageIndex === 2 ? 'current' : 'completed',
        description: 'Chegada no armazém de Miami',
        location: 'Miami, FL, US',
        timestamp: new Date(new Date(fedexDate).getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Embarque Agendado
    if (currentStageIndex >= 3) {
      const armazemDate = events[events.length - 1]?.timestamp || now.toISOString();
      events.push({
        id: 'synthetic-embarque-agendado',
        sales_order: so.salesOrder,
        status: 'Embarque Agendado',
        event_status: currentStageIndex === 3 ? 'current' : 'completed',
        description: 'Embarque programado',
        location: 'Miami, FL, US',
        timestamp: new Date(new Date(armazemDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Embarque Confirmado
    if (currentStageIndex >= 4) {
      const embarqueAgendadoDate = events[events.length - 1]?.timestamp || now.toISOString();
      events.push({
        id: 'synthetic-embarque-confirmado',
        sales_order: so.salesOrder,
        status: 'Embarque Confirmado',
        event_status: currentStageIndex === 4 ? 'current' : 'completed',
        description: 'Embarque confirmado',
        location: 'Miami, FL, US',
        timestamp: new Date(new Date(embarqueAgendadoDate).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Chegada no Brasil
    if (currentStageIndex >= 5) {
      const embarqueConfirmadoDate = events[events.length - 1]?.timestamp || now.toISOString();
      events.push({
        id: 'synthetic-chegada-brasil',
        sales_order: so.salesOrder,
        status: 'Chegada no Brasil',
        event_status: currentStageIndex === 5 ? 'current' : 'completed',
        description: 'Chegada no Brasil',
        location: 'Aeroporto de Guarulhos',
        timestamp: new Date(new Date(embarqueConfirmadoDate).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Desembaraço
    if (currentStageIndex >= 6) {
      const chegadaBrasilDate = events[events.length - 1]?.timestamp || now.toISOString();
      events.push({
        id: 'synthetic-desembaraco',
        sales_order: so.salesOrder,
        status: 'Desembaraço',
        event_status: currentStageIndex === 6 ? 'current' : 'completed',
        description: 'Em processo de desembaraço aduaneiro',
        location: 'Aeroporto de Guarulhos',
        timestamp: new Date(new Date(chegadaBrasilDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Entregue
    if (currentStageIndex >= 7) {
      const desembaracoDate = events[events.length - 1]?.timestamp || now.toISOString();
      events.push({
        id: 'synthetic-entregue',
        sales_order: so.salesOrder,
        status: 'Entregue',
        event_status: 'completed',
        description: 'Entregue ao cliente',
        location: 'Destino final',
        timestamp: new Date(new Date(desembaracoDate).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    console.log('✅ Eventos sintéticos criados:', events.length, events.map(e => `${e.status} (${e.event_status})`));
    
    return events;
  };

  useEffect(() => {
    loadShipmentHistory();
  }, [so.salesOrder]);

  // Transform shipment history to timeline events
  const timelineEvents = shipmentHistory.map((event, index) => {
    const eventStatus = event.status || event.evento || '';
    
    // Usar o event_status se disponível (para eventos sintéticos), senão calcular
    let displayStatus: 'completed' | 'current' | 'upcoming';
    if (event.event_status) {
      displayStatus = event.event_status as 'completed' | 'current' | 'upcoming';
    } else {
      // Para eventos reais do banco, determinar se é atual
      const isCurrent = eventStatus.toLowerCase().trim() === so.statusAtual.toLowerCase().trim();
      displayStatus = isCurrent ? 'current' : 'completed';
    }
    
    return {
      id: event.id.toString(),
      tipo: eventStatus.replace(/\s+/g, '_').toLowerCase(),
      titulo: eventStatus,
      data: event.timestamp || event.data_evento,
      dataPrevista: event.detalhes?.data_prevista,
      status: displayStatus,
      detalhes: event.description || (event.detalhes ? JSON.stringify(event.detalhes) : undefined)
    };
  });
  
  console.log('📋 Timeline events:', timelineEvents.length, timelineEvents.map(e => `${e.titulo} (${e.status})`));

  // Add future events based on current status
  const addFutureEvents = () => {
    const futureEvents = [];
    const currentStatus = so.statusAtual.toLowerCase();
    
    // Se ainda está em produção, não adicionar previsões
    if (currentStatus.includes('produção') || currentStatus.includes('producao')) {
      return futureEvents;
    }
    
    // Encontrar a última data real para calcular previsões
    const lastEvent = timelineEvents[timelineEvents.length - 1];
    const lastDate = lastEvent ? new Date(lastEvent.data) : new Date();
    
    if (!currentStatus.includes('entregue')) {
      // Se está em FedEx (ainda não chegou no armazém)
      if (currentStatus.includes('fedex') && !currentStatus.includes('armazém') && !currentStatus.includes('armazem')) {
        futureEvents.push({
          id: 'future_armazem',
          tipo: 'no_armazem',
          titulo: 'No Armazém',
          data: new Date(lastDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_embarque_agendado',
          tipo: 'embarque_agendado',
          titulo: 'Embarque Agendado',
          data: new Date(lastDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), // +3 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_embarque_confirmado',
          tipo: 'embarque_confirmado',
          titulo: 'Embarque Confirmado',
          data: new Date(lastDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_chegada_brasil',
          tipo: 'chegada_brasil',
          titulo: 'Chegada no Brasil',
          data: new Date(lastDate.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(), // +4 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString(), // +3 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
          status: 'upcoming' as const
        });
      } 
      // Se está no armazém
      else if (currentStatus.includes('armazém') || currentStatus.includes('armazem')) {
        if (!currentStatus.includes('embarque')) {
          futureEvents.push({
            id: 'future_embarque_agendado',
            tipo: 'embarque_agendado',
            titulo: 'Embarque Agendado',
            data: new Date(lastDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'upcoming' as const
          });
          
          futureEvents.push({
            id: 'future_embarque_confirmado',
            tipo: 'embarque_confirmado',
            titulo: 'Embarque Confirmado',
            data: new Date(lastDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
            status: 'upcoming' as const
          });
          
          futureEvents.push({
            id: 'future_chegada_brasil',
            tipo: 'chegada_brasil',
            titulo: 'Chegada no Brasil',
            data: new Date(lastDate.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(), // +4 dias
            status: 'upcoming' as const
          });
          
          futureEvents.push({
            id: 'future_desembaraco',
            tipo: 'desembaraco',
            titulo: 'Desembaraço',
            data: new Date(lastDate.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(), // +3 dias
            status: 'upcoming' as const
          });
          
          futureEvents.push({
            id: 'future_delivered',
            tipo: 'entregue',
            titulo: 'Entregue',
            data: new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
            status: 'upcoming' as const
          });
        }
      }
      // Se embarque está agendado
      else if (currentStatus.includes('embarque agendado')) {
        futureEvents.push({
          id: 'future_embarque_confirmado',
          tipo: 'embarque_confirmado',
          titulo: 'Embarque Confirmado',
          data: new Date(lastDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_chegada_brasil',
          tipo: 'chegada_brasil',
          titulo: 'Chegada no Brasil',
          data: new Date(lastDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), // +4 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(), // +3 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
          status: 'upcoming' as const
        });
      }
      // Se embarque está confirmado
      else if (currentStatus.includes('embarque confirmado')) {
        futureEvents.push({
          id: 'future_chegada_brasil',
          tipo: 'chegada_brasil',
          titulo: 'Chegada no Brasil',
          data: new Date(lastDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +3 dias
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
          status: 'upcoming' as const
        });
      }
      // Se já chegou no Brasil
      else if (currentStatus.includes('chegada') || currentStatus.includes('brasil')) {
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +2 dias
          status: 'upcoming' as const
        });
      }
      // Se está em desembaraço
      else if (currentStatus.includes('desembaraço') || currentStatus.includes('desembaraco')) {
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
      }
    }
    
    return futureEvents;
  };

  const allEvents = [...timelineEvents, ...addFutureEvents()];

  const alertLevel = getAlertLevel(so);

  const isArrivingToday = () => {
    // Check if any future events are scheduled for today
    return allEvents.some(event => {
      const eventDate = new Date(event.data);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString() && 
             event.status === 'upcoming' && 
             event.titulo.toLowerCase().includes('chegada');
    });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-logistics">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">SO {so.salesOrder}</h2>
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
              <Badge 
                variant={alertLevel.color as any}
                className={alertLevel.level === 3 ? 'animate-pulse' : ''}
              >
                {alertLevel.message}
              </Badge>
            )}
            
            {isArrivingToday() && (
              <Badge className="bg-status-production text-status-production-foreground animate-bounce">
                CHEGADA HOJE
              </Badge>
            )}
            
            {so.isDelivered && (
              <Badge className="bg-status-delivered text-status-delivered-foreground">
                ENTREGUE
              </Badge>
            )}
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
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
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allEvents.length > 0 ? (
                  <Timeline events={allEvents} />
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
      </div>

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
    </div>
  );
};

export default SODetails;