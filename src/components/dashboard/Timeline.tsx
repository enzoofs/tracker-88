import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plane, 
  Ship, 
  Truck, 
  MapPin, 
  Clock,
  CheckCircle,
  Circle
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  data: string;
  dataPrevista?: string;
  status: 'completed' | 'current' | 'upcoming';
  detalhes?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  const getEventIcon = (tipo: string, status: string) => {
    const iconClass = status === 'completed' ? 'text-status-delivered' : 
                     status === 'current' ? 'text-primary' : 'text-muted-foreground';
    
    // Mapear eventos para status padronizados
    const eventStatus = mapEventToStatus(tipo);
    
    switch (eventStatus) {
      case 'em_producao':
        return <div className={`text-2xl ${iconClass}`}>🏭</div>;
      case 'no_armazem':
        return <Package className={`h-5 w-5 ${iconClass}`} />;
      case 'em_importacao':
        return <div className={`text-2xl ${iconClass}`}>✈️</div>;
      case 'em_rota_entrega':
        return <div className={`text-2xl ${iconClass}`}>🚚</div>;
      case 'entregue':
        return <div className={`text-2xl ${iconClass}`}>✅</div>;
      default:
        return <Circle className={`h-5 w-5 ${iconClass}`} />;
    }
  };

  const mapEventToStatus = (evento: string) => {
    const eventoLower = evento.toLowerCase();
    
    if (eventoLower.includes('produção') || eventoLower.includes('producao')) {
      return 'em_producao';
    }
    if (eventoLower.includes('armazém') || eventoLower.includes('armazem') || 
        eventoLower.includes('finalizada') || eventoLower.includes('saído') || 
        eventoLower.includes('saido')) {
      return 'no_armazem';
    }
    if (eventoLower.includes('embarcado') || eventoLower.includes('trânsito') || 
        eventoLower.includes('transito') || eventoLower.includes('chegada') ||
        eventoLower.includes('desembaraço') || eventoLower.includes('desembaraco')) {
      return 'em_importacao';
    }
    if (eventoLower.includes('rota') || eventoLower.includes('entrega') && !eventoLower.includes('entregue')) {
      return 'em_rota_entrega';
    }
    if (eventoLower.includes('entregue') || eventoLower.includes('destino')) {
      return 'entregue';
    }
    
    return 'em_importacao'; // default
  };

  const getStatusTitle = (evento: string) => {
    const status = mapEventToStatus(evento);
    const titleMap = {
      'em_producao': 'Em Produção',
      'no_armazem': 'No Armazém',
      'em_importacao': 'Em Importação',
      'em_rota_entrega': 'Em Rota de Entrega',
      'entregue': 'Entregue'
    };
    return titleMap[status] || evento;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-status-delivered" />;
      case 'current':
        return <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDetailsText = (detalhes?: string) => {
    if (!detalhes) return null;
    
    // Se for string simples, retornar apenas se for útil
    if (typeof detalhes === 'string' && !detalhes.startsWith('{')) {
      return detalhes.length > 100 ? null : detalhes;
    }
    
    try {
      const data = JSON.parse(detalhes);
      
      // Filtrar apenas dados relevantes
      const relevantKeys = ['porto', 'aeroporto', 'status', 'nova_data', 'localizacao', 'temperatura', 'observacoes'];
      const filteredData = Object.entries(data).filter(([key]) => 
        relevantKeys.includes(key.toLowerCase()) || key.length < 20
      );
      
      if (filteredData.length === 0) return null;
      
      const formatted = filteredData.map(([key, value]) => {
        // Pular valores vazios ou nulos
        if (!value || value === '' || value === null) return null;
        
        const keyTranslations: Record<string, string> = {
          porto: 'Aeroporto',
          aeroporto: 'Aeroporto',
          status: 'Status',
          nova_data: 'Nova previsão',
          localizacao: 'Localização',
          temperatura: 'Temperatura',
          observacoes: 'Observações'
        };
        
        const translatedKey = keyTranslations[key.toLowerCase()] || key;
        
        if (key.toLowerCase() === 'nova_data' && typeof value === 'string') {
          const date = new Date(value);
          return `${translatedKey}: ${date.toLocaleDateString('pt-BR')}`;
        }
        
        if (key.toLowerCase() === 'status') {
          const statusMap: Record<string, string> = {
            'Navegando': 'Em voo',
            'Em voo': 'Em voo'
          };
          return `${translatedKey}: ${statusMap[String(value)] || String(value)}`;
        }
        
        // Limitar tamanho do valor
        const valueStr = String(value);
        if (valueStr.length > 50) return null;
        
        return `${translatedKey}: ${valueStr}`;
      }).filter(Boolean);
      
      return formatted.length > 0 ? formatted.join(' • ') : null;
    } catch {
      // Se não for JSON válido, retornar apenas se for texto curto e útil
      return detalhes.length < 100 && !detalhes.includes('undefined') ? detalhes : null;
    }
  };

  // Remove duplicates and keep only the most recent event of each type
  const removeDuplicateEvents = (events: TimelineEvent[]) => {
    const eventMap = new Map<string, TimelineEvent>();
    
    // Sort events by date (most recent first)
    const sortedEvents = [...events].sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    
    // Keep only the most recent event of each type
    sortedEvents.forEach(event => {
      const eventType = event.tipo.toLowerCase().replace(/[^a-z]/g, '_');
      if (!eventMap.has(eventType)) {
        eventMap.set(eventType, event);
      }
    });
    
    // Return events sorted chronologically (oldest first)
    return Array.from(eventMap.values()).sort((a, b) => 
      new Date(a.data).getTime() - new Date(b.data).getTime()
    );
  };

  const uniqueEvents = removeDuplicateEvents(events);

  const isDelayed = (dataReal: string, dataPrevista?: string) => {
    if (!dataPrevista) return false;
    return new Date(dataReal) > new Date(dataPrevista);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Timeline horizontal */}
      <div className="flex items-center justify-between mb-6">
        {uniqueEvents.map((event, index) => (
          <div key={event.id} className="flex flex-col items-center relative">
            {/* Linha conectora */}
            {index < uniqueEvents.length - 1 && (
              <div className={`absolute top-6 left-1/2 w-20 h-0.5 transform translate-x-1/2 ${
                event.status === 'completed' ? 'bg-status-delivered' : 'bg-border'
              }`} />
            )}
            
            {/* Ícone do evento */}
            <div className={`relative z-10 p-3 rounded-full border-2 transition-all ${
              event.status === 'completed' ? 'bg-status-delivered border-status-delivered' :
              event.status === 'current' ? 'bg-primary border-primary' :
              'bg-muted border-border'
            }`}>
              {getEventIcon(event.tipo, event.status)}
            </div>
            
            {/* Informações do evento */}
            <div className="mt-2 text-center max-w-24">
              <div className={`text-xs font-medium ${
                event.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {getStatusTitle(event.titulo)}
              </div>
              
              {event.data && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(event.data)}
                </div>
              )}
              
              {event.dataPrevista && isDelayed(event.data, event.dataPrevista) && (
                <Badge variant="destructive" className="text-xs mt-1">
                  Atrasado
                </Badge>
              )}
              
              {event.status === 'current' && (
                <Badge variant="default" className="text-xs mt-1 bg-primary">
                  Atual
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lista detalhada */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Histórico Detalhado</h4>
        {uniqueEvents.filter(e => e.status !== 'upcoming').map((event) => (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="mt-0.5">
              {getStatusIcon(event.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-sm">{getStatusTitle(event.titulo)}</h5>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(event.data)}
                </div>
              </div>
              
              {event.detalhes && formatDetailsText(event.detalhes) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDetailsText(event.detalhes)}
                </p>
              )}
              
              {event.dataPrevista && (
                <div className="text-xs text-muted-foreground mt-1">
                  Previsto: {formatDate(event.dataPrevista)}
                  {isDelayed(event.data, event.dataPrevista) && (
                    <span className="text-destructive ml-2">
                      • Atrasado
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timeline;