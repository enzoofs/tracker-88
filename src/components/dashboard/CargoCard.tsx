import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Thermometer, MapPin, Truck, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CargoCardProps {
  carga: {
    numero_carga: string;
    tipo_temperatura: string;
    status: string;
    data_chegada_prevista?: string;
    origem?: string;
    destino?: string;
    transportadora?: string;
    so_count?: number;
  };
  onClick: () => void;
}

const CargoCard = ({ carga, onClick }: CargoCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'no armazém':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'em preparação':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'despachada':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'entregue':
        return 'bg-status-delivered text-status-delivered-foreground border-status-delivered/30 font-bold';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTempIcon = (temp: string) => {
    return temp?.toLowerCase() === 'controlada' ? '🌡️' : '🏠';
  };

  return (
    <Card
      className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border-border/50 bg-card hover:border-primary/50"
      onClick={onClick}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">CARGA {carga.numero_carga}</h3>
              <p className="text-sm text-muted-foreground">
                {carga.so_count || 0} SOs consolidadas
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusColor(carga.status)}>
              {carga.status}
            </Badge>
            {(carga.so_count || 0) > 10 && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse">
                ⚡ CONSOLIDADA
              </Badge>
            )}
          </div>
        </div>

        {/* Temperatura */}
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {getTempIcon(carga.tipo_temperatura)} {carga.tipo_temperatura}
          </span>
        </div>

        {/* Rota */}
        {(carga.origem || carga.destino) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {carga.origem || '---'} → {carga.destino || '---'}
            </span>
          </div>
        )}

        {/* Transportadora */}
        {carga.transportadora && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>{carga.transportadora}</span>
          </div>
        )}

        {/* Data prevista */}
        {carga.data_chegada_prevista && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Prevista: {formatDistanceToNow(new Date(carga.data_chegada_prevista), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CargoCard;
