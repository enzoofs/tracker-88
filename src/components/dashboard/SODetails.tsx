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
  Thermometer,
  User,
  FileText,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Timeline from './Timeline';

interface SO {
  id: string;
  salesOrder: string;
  cliente: string;
  produtos: string;
  statusAtual: string;
  statusCliente: string;
  ultimaLocalizacao: string;
  dataUltimaAtualizacao: string;
  temperatura?: 'cold' | 'ambient' | 'controlled';
  prioridade: 'high' | 'normal' | 'low';
  trackingNumbers?: string;
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
        .order('data_evento', { ascending: true });

      if (error) throw error;
      setShipmentHistory(data || []);
    } catch (error) {
      console.error('Error loading shipment history:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico do envio.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipmentHistory();
  }, [so.salesOrder]);

  // Transform shipment history to timeline events
  const timelineEvents = shipmentHistory.map((event, index) => {
    const isLastEvent = index === shipmentHistory.length - 1;
    const isCurrent = event.evento.toLowerCase().includes(so.statusAtual.toLowerCase());
    
    return {
      id: event.id.toString(),
      tipo: event.evento.replace(/\s+/g, '_').toLowerCase(),
      titulo: event.evento,
      data: event.data_evento,
      dataPrevista: event.detalhes?.data_prevista,
      status: isCurrent ? 'current' as const : isLastEvent ? 'completed' as const : 'completed' as const,
      detalhes: event.detalhes ? JSON.stringify(event.detalhes) : undefined
    };
  });

  // Add future events based on current status
  const addFutureEvents = () => {
    const futureEvents = [];
    const currentStatus = so.statusAtual.toLowerCase();
    
    if (!currentStatus.includes('entregue')) {
      if (!currentStatus.includes('rota') && !currentStatus.includes('entrega')) {
        futureEvents.push({
          id: 'future_delivery',
          tipo: 'em_rota_entrega',
          titulo: 'Em Rota de Entrega',
          data: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming' as const
        });
      }
      
      futureEvents.push({
        id: 'future_delivered',
        tipo: 'entregue',
        titulo: 'Entregue',
        data: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'upcoming' as const
      });
    }
    
    return futureEvents;
  };

  const allEvents = [...timelineEvents, ...addFutureEvents()];

  const getTemperatureIcon = (temperatura?: string) => {
    if (!temperatura) return null;
    
    switch (temperatura) {
      case 'cold':
        return <span className="text-temp-cold">❄️</span>;
      case 'controlled':
        return <Thermometer className="h-4 w-4 text-temp-controlled" />;
      default:
        return <Thermometer className="h-4 w-4 text-temp-ambient" />;
    }
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'high':
        return (
          <Badge className="bg-priority-high text-white flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Alta Prioridade
          </Badge>
        );
      case 'normal':
        return <Badge variant="outline">Normal</Badge>;
      case 'low':
        return <Badge className="bg-priority-low text-white">Baixa</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const isDelayed = () => {
    // Simple logic to determine if SO is delayed
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate > 7; // Consider delayed if no update for more than 7 days
  };

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
            {/* Smart Alerts */}
            {isDelayed() && (
              <Badge variant="destructive" className="animate-pulse">
                ATRASADO
              </Badge>
            )}
            
            {isArrivingToday() && (
              <Badge className="bg-status-production text-status-production-foreground animate-bounce">
                CHEGADA HOJE
              </Badge>
            )}
            
            {so.temperatura === 'cold' && (
              <Badge className="bg-temp-cold text-white flex items-center gap-1">
                ❄️ Temperatura Controlada
              </Badge>
            )}
            
            {getPriorityBadge(so.prioridade)}
            
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* SO Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-primary" />
                    Status Atual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className="bg-status-transit text-status-transit-foreground">
                      {so.statusCliente}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {so.statusAtual}
                    </p>
                  </div>
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
                    Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-mono break-all">
                    {so.trackingNumbers || 'Não disponível'}
                  </p>
                  {getTemperatureIcon(so.temperatura) && (
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      {getTemperatureIcon(so.temperatura)}
                      <span className="capitalize">{so.temperatura}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Products */}
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