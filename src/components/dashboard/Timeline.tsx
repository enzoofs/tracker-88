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
    
    switch (tipo.toLowerCase()) {
      case 'em_producao':
      case 'producao_finalizada':
        return <Package className={`h-5 w-5 ${iconClass}`} />;
      case 'saido_fornecedor':
      case 'embarcado':
        return <Plane className={`h-5 w-5 ${iconClass}`} />;
      case 'em_transito_internacional':
        return <Ship className={`h-5 w-5 ${iconClass}`} />;
      case 'chegada_brasil':
      case 'desembaraco_concluido':
        return <MapPin className={`h-5 w-5 ${iconClass}`} />;
      case 'em_rota_entrega':
      case 'saiu_para_entrega':
        return <Truck className={`h-5 w-5 ${iconClass}`} />;
      default:
        return <Circle className={`h-5 w-5 ${iconClass}`} />;
    }
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

  const isDelayed = (dataReal: string, dataPrevista?: string) => {
    if (!dataPrevista) return false;
    return new Date(dataReal) > new Date(dataPrevista);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Timeline horizontal */}
      <div className="flex items-center justify-between mb-6">
        {events.map((event, index) => (
          <div key={event.id} className="flex flex-col items-center relative">
            {/* Linha conectora */}
            {index < events.length - 1 && (
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
                {event.titulo}
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
        {events.filter(e => e.status !== 'upcoming').map((event) => (
          <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <div className="mt-0.5">
              {getStatusIcon(event.status)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-sm">{event.titulo}</h5>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(event.data)}
                </div>
              </div>
              
              {event.detalhes && (
                <p className="text-xs text-muted-foreground mt-1">
                  {event.detalhes}
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