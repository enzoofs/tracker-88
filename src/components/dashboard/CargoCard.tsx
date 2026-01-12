import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Thermometer, MapPin, Truck, Calendar, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CargoCardProps {
  carga: {
    numero_carga: string;
    tipo_temperatura: string;
    status: string;
    data_chegada_prevista?: string;
    data_armazem?: string;
    data_embarque?: string;
    data_entrega?: string;
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

  // Verificar dados faltantes (para cargas não em consolidação)
  const isNotInConsolidation = !carga.status?.toLowerCase().includes('consolidação');
  const missingData = isNotInConsolidation ? {
    armazem: !carga.data_armazem,
    embarque: !carga.data_embarque,
    entrega: carga.status?.toLowerCase() === 'entregue' && !carga.data_entrega,
  } : { armazem: false, embarque: false, entrega: false };
  
  const hasMissingData = missingData.armazem || missingData.embarque || missingData.entrega;
  const missingFields = [
    missingData.armazem && 'Armazém',
    missingData.embarque && 'Embarque',
    missingData.entrega && 'Entrega',
  ].filter(Boolean);

  return (
    <TooltipProvider>
      <Card
        className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border-border/50 bg-card hover:border-primary/50 ${hasMissingData ? 'ring-1 ring-amber-500/30' : ''}`}
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
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">CARGA {carga.numero_carga}</h3>
                  {hasMissingData && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Dados faltantes: {missingFields.join(', ')}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {carga.so_count || 0} SOs consolidadas
                </p>
              </div>
            </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={getStatusColor(carga.status)}>
              {carga.status}
            </Badge>
            {carga.data_entrega && (
              <span className="text-xs text-muted-foreground">
                {new Date(carga.data_entrega).toLocaleDateString('pt-BR')}
              </span>
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
    </TooltipProvider>
  );
};

export default CargoCard;
