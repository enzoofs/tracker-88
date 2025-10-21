import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plane, 
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
      case 'fedex':
        return <div className={`text-2xl ${iconClass}`}>📦</div>;
      case 'no_armazem':
        return <div className={`text-2xl ${iconClass}`}>🏢</div>;
      case 'embarque_agendado':
        return <div className={`text-2xl ${iconClass}`}>📅</div>;
      case 'embarque_confirmado':
        return <div className={`text-2xl ${iconClass}`}>🛫</div>;
      case 'chegada_brasil':
        return <div className={`text-2xl ${iconClass}`}>🇧🇷</div>;
      case 'voo_internacional':
        return <div className={`text-2xl ${iconClass}`}>✈️</div>;
      case 'desembaraco':
        return <div className={`text-2xl ${iconClass}`}>📋</div>;
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
    if (eventoLower.includes('fedex')) {
      return 'fedex';
    }
    if (eventoLower.includes('armazém') || eventoLower.includes('armazem')) {
      return 'no_armazem';
    }
    if (eventoLower.includes('embarque agendado')) {
      return 'embarque_agendado';
    }
    if (eventoLower.includes('embarque confirmado')) {
      return 'embarque_confirmado';
    }
    if (eventoLower.includes('chegada') || eventoLower.includes('brasil')) {
      return 'chegada_brasil';
    }
    if (eventoLower.includes('voo') || eventoLower.includes('internacional')) {
      return 'voo_internacional';
    }
    if (eventoLower.includes('desembaraço') || eventoLower.includes('desembaraco')) {
      return 'desembaraco';
    }
    if (eventoLower.includes('entregue') || eventoLower.includes('destino')) {
      return 'entregue';
    }
    
    return 'em_producao'; // default
  };

  const getStatusTitle = (evento: string) => {
    const status = mapEventToStatus(evento);
    const titleMap: Record<string, string> = {
      'em_producao': 'Em Produção',
      'fedex': 'FedEx',
      'no_armazem': 'No Armazém',
      'embarque_agendado': 'Embarque Agendado',
      'embarque_confirmado': 'Embarque Confirmado',
      'chegada_brasil': 'Chegada no Brasil',
      'voo_internacional': 'Voo Internacional',
      'desembaraco': 'Desembaraço',
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

  const formatDetailsText = (detalhes?: string): string | null => {
    if (!detalhes || typeof detalhes !== 'string') return null;
    
    // Sanitize input - prevent XSS and limit length
    const sanitizedDetails = detalhes.trim().slice(0, 1000);
    
    // Se for string simples, sanitizar e retornar apenas se for útil
    if (!sanitizedDetails.startsWith('{') && !sanitizedDetails.startsWith('[')) {
      const cleaned = sanitizedDetails.replace(/[<>'"&]/g, ''); // Basic XSS prevention
      return cleaned.length > 100 || cleaned.includes('undefined') ? null : cleaned;
    }
    
    try {
      // Safe JSON parsing with validation
      const data = JSON.parse(sanitizedDetails);
      
      // Validate that it's a safe object (not array or null)
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return null;
      }
      
      // Safely extract only relevant keys
      const relevantKeys = ['porto', 'aeroporto', 'status', 'nova_data', 'localizacao', 'temperatura', 'observacoes'];
      const filteredData = Object.entries(data).filter(([key]) => 
        typeof key === 'string' && 
        (relevantKeys.includes(key.toLowerCase()) || key.length < 20)
      );
      
      if (filteredData.length === 0) return null;
      
      const safeString = (value: unknown): string => {
        if (typeof value === 'string') {
          return value.slice(0, 50).replace(/[<>'"&]/g, ''); // XSS prevention
        }
        if (typeof value === 'number') {
          return String(value);
        }
        return '';
      };
      
      const formatted = filteredData.map(([key, value]) => {
        // Skip empty or null values
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
        
        const translatedKey = keyTranslations[key.toLowerCase()] || safeString(key);
        
        if (key.toLowerCase() === 'nova_data' && typeof value === 'string') {
          try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return null; // Invalid date
            return `${translatedKey}: ${date.toLocaleDateString('pt-BR')}`;
          } catch {
            return null;
          }
        }
        
        if (key.toLowerCase() === 'status') {
          const statusMap: Record<string, string> = {
            'Navegando': 'Em voo',
            'Em voo': 'Em voo'
          };
          const safeValue = safeString(value);
          return `${translatedKey}: ${statusMap[safeValue] || safeValue}`;
        }
        
        const safeValue = safeString(value);
        if (!safeValue) return null;
        
        return `${translatedKey}: ${safeValue}`;
      }).filter(Boolean);
      
      return formatted.length > 0 ? formatted.join(' • ') : null;
    } catch (error) {
      // Safe fallback for invalid JSON - sanitize the raw string
      const cleaned = sanitizedDetails.replace(/[<>'"&]/g, '');
      return cleaned.length < 100 && !cleaned.includes('undefined') ? cleaned : null;
    }
  };

  // Just use the events as received - no filtering or deduplication
  console.log('📊 Timeline recebeu eventos:', events.length, events);

  const isDelayed = (dataReal: string, dataPrevista?: string) => {
    if (!dataPrevista) return false;
    return new Date(dataReal) > new Date(dataPrevista);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Timeline horizontal */}
      <div className="flex items-center justify-between">
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
              event.status === 'completed' ? 'bg-status-delivered/20 border-status-delivered' :
              event.status === 'current' ? 'bg-primary/20 border-primary' :
              'bg-muted border-border'
            }`}>
              {getEventIcon(event.tipo, event.status)}
            </div>
            
            {/* Informações do evento */}
            <div className="mt-2 text-center max-w-24 group relative">
              <div className={`text-xs font-medium ${
                event.status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {getStatusTitle(event.titulo)}
              </div>
              
              {/* Only show date for completed or current events */}
              {event.status !== 'upcoming' && event.data && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(event.data)}
                </div>
              )}
              
              {/* Show predicted date on hover for upcoming events */}
              {event.status === 'upcoming' && event.data && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 border pointer-events-none">
                  Previsão: {formatDate(event.data)}
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
    </div>
  );
};

export default Timeline;