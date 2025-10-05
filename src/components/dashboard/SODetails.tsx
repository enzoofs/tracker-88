import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Package, 
  Calendar,
  MapPin,
  FileText,
  Clock,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Timeline from './Timeline';

interface SO {
  id: string;
  salesOrder: string;
  cliente: string;
  produtos: string;
  valorTotal?: number;
  statusAtual: string;
  ultimaLocalizacao: string;
  dataUltimaAtualizacao: string;
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
  const { toast } = useToast();

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
    
    // Sempre adiciona "Em Produção" como primeiro evento
    events.push({
      id: 'synthetic-producao',
      sales_order: so.salesOrder,
      status: 'Em Produção',
      description: 'Produto em fabricação',
      location: 'Fornecedor',
      timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias atrás
    });

    const statusLower = statusAtual.toLowerCase();
    
    // Adiciona eventos baseados no status atual
    if (statusLower.includes('armazém') || statusLower.includes('armazem') || 
        statusLower.includes('importação') || statusLower.includes('importacao') ||
        statusLower.includes('entregue')) {
      events.push({
        id: 'synthetic-fedex',
        sales_order: so.salesOrder,
        status: 'FedEx',
        description: 'Em trânsito para o armazém',
        location: 'Em trânsito',
        timestamp: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString() // 20 dias atrás
      });
      
      events.push({
        id: 'synthetic-armazem',
        sales_order: so.salesOrder,
        status: 'No Armazém',
        description: 'Chegada no armazém de Miami',
        location: 'Miami, FL, US',
        timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString() // 15 dias atrás
      });
    }
    
    if (statusLower.includes('importação') || statusLower.includes('importacao') || 
        statusLower.includes('entregue')) {
      events.push({
        id: 'synthetic-voo',
        sales_order: so.salesOrder,
        status: 'Voo Internacional',
        description: 'Em voo para o Brasil',
        location: 'Em trânsito',
        timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 dias atrás
      });
      
      events.push({
        id: 'synthetic-desembaraco',
        sales_order: so.salesOrder,
        status: 'Desembaraço',
        description: 'Em processo de desembaraço aduaneiro',
        location: 'Aeroporto de Guarulhos',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 dias atrás
      });
    }
    
    if (statusLower.includes('entregue')) {
      events.push({
        id: 'synthetic-entregue',
        sales_order: so.salesOrder,
        status: 'Entregue',
        description: 'Entregue ao cliente',
        location: 'Destino final',
        timestamp: dataAtualizacao
      });
    }
    
    return events;
  };

  useEffect(() => {
    loadShipmentHistory();
  }, [so.salesOrder]);

  // Transform shipment history to timeline events
  const timelineEvents = shipmentHistory.map((event, index) => {
    const isLastEvent = index === shipmentHistory.length - 1;
    const eventStatus = event.status || event.evento || '';
    const isCurrent = eventStatus.toLowerCase().includes(so.statusAtual.toLowerCase());
    
    return {
      id: event.id.toString(),
      tipo: eventStatus.replace(/\s+/g, '_').toLowerCase(),
      titulo: eventStatus,
      data: event.timestamp || event.data_evento,
      dataPrevista: event.detalhes?.data_prevista,
      status: isCurrent ? 'current' as const : isLastEvent ? 'completed' as const : 'completed' as const,
      detalhes: event.description || (event.detalhes ? JSON.stringify(event.detalhes) : undefined)
    };
  });

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
    
    // Prazos após saída da fábrica:
    // 1 dia para armazém
    // 5 dias para voo internacional (após chegar no armazém)
    // 2 dias para desembaraço (após voo)
    // 1 dia para entrega no armazém final (após desembaraço)
    // 5 dias para entrega no cliente (após armazém final)
    
    if (!currentStatus.includes('entregue')) {
      // Se não chegou no armazém ainda
      if (!currentStatus.includes('armazém') && !currentStatus.includes('armazem')) {
        futureEvents.push({
          id: 'future_armazem',
          tipo: 'no_armazem',
          titulo: 'No Armazém',
          data: new Date(lastDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_voo',
          tipo: 'voo_internacional',
          titulo: 'Voo Internacional',
          data: new Date(lastDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 1 + 5
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 1 + 5 + 2
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 1 + 5 + 2 + 1 + 5
          status: 'upcoming' as const
        });
      } 
      // Se já está no armazém
      else if (!currentStatus.includes('voo') && !currentStatus.includes('internacional')) {
        futureEvents.push({
          id: 'future_voo',
          tipo: 'voo_internacional',
          titulo: 'Voo Internacional',
          data: new Date(lastDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 5 + 2
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString(), // 5 + 2 + 1 + 5
          status: 'upcoming' as const
        });
      }
      // Se já está em voo
      else if (!currentStatus.includes('desembaraço') && !currentStatus.includes('desembaraco')) {
        futureEvents.push({
          id: 'future_desembaraco',
          tipo: 'desembaraco',
          titulo: 'Desembaraço',
          data: new Date(lastDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
        
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(), // 2 + 1 + 5
          status: 'upcoming' as const
        });
      }
      // Se já está em desembaraço
      else if (!currentStatus.includes('entregue') && !currentStatus.includes('destino')) {
        futureEvents.push({
          id: 'future_delivered',
          tipo: 'entregue',
          titulo: 'Entregue',
          data: new Date(lastDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 1 + 5
          status: 'upcoming' as const
        });
      }
    }
    
    return futureEvents;
  };

  const allEvents = [...timelineEvents, ...addFutureEvents()];

  // Calcula nível de alerta baseado em atrasos
  const getAlertLevel = () => {
    // Não mostrar alerta se ainda está em produção ou já foi entregue
    if (so.isDelivered) return null;
    
    const currentStatus = so.statusAtual.toLowerCase();
    if (currentStatus.includes('produção') || currentStatus.includes('producao')) {
      return null;
    }
    
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 1000)) / 24;
    
    // Calcular atraso baseado no status atual e prazos esperados
    let expectedDays = 0;
    let stage = '';
    
    if (currentStatus.includes('fedex') || currentStatus.includes('saiu')) {
      expectedDays = 1; // Deveria chegar no armazém em 1 dia
      stage = 'chegada no armazém';
    } else if (currentStatus.includes('armazém') || currentStatus.includes('armazem')) {
      expectedDays = 5; // Deveria estar em voo em 5 dias
      stage = 'voo internacional';
    } else if (currentStatus.includes('voo') || currentStatus.includes('internacional')) {
      expectedDays = 2; // Deveria estar em desembaraço em 2 dias
      stage = 'desembaraço';
    } else if (currentStatus.includes('desembaraço') || currentStatus.includes('desembaraco')) {
      expectedDays = 6; // Deveria ser entregue em 6 dias (1 + 5)
      stage = 'entrega';
    }
    
    if (expectedDays === 0) return null;
    
    const daysOverdue = Math.floor(daysSinceUpdate - expectedDays);
    
    if (daysOverdue > 5) {
      return { 
        level: 3, 
        message: `CRÍTICO: ${daysOverdue} dias de atraso - ${stage}`, 
        color: 'destructive' 
      };
    } else if (daysOverdue > 2) {
      return { 
        level: 2, 
        message: `ATENÇÃO: ${daysOverdue} dias de atraso - ${stage}`, 
        color: 'warning' 
      };
    } else if (daysOverdue > 0) {
      return { 
        level: 1, 
        message: `AVISO: ${daysOverdue} dia(s) de atraso - ${stage}`, 
        color: 'default' 
      };
    }
    
    return null;
  };

  const alertLevel = getAlertLevel();

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
                    {new Date(so.dataUltimaAtualizacao).toLocaleDateString('pt-BR')}
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
    </div>
  );
};

export default SODetails;