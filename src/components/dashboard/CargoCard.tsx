import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  isAdmin?: boolean;
  isSelected?: boolean;
  onSelect?: (cargoNumber: string) => void;
}

const CargoCard = ({ carga, onClick, isAdmin = false, isSelected = false, onSelect }: CargoCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'no armazém':
        return 'bg-status-shipping/10 text-status-shipping border-status-shipping/20';
      case 'em preparação':
        return 'bg-status-production/10 text-status-production border-status-production/20';
      case 'despachada':
        return 'bg-status-delivered/10 text-status-delivered border-status-delivered/20';
      case 'entregue':
        return 'bg-status-delivered text-status-delivered-foreground border-status-delivered/30 font-bold';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTempIcon = (temp: string) => {
    return temp?.toLowerCase() === 'controlada' ? 'Controlada' : 'Ambiente';
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
        className={`p-6 cursor-pointer transition-colors bg-card hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${hasMissingData ? 'border-amber-500/50' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
        tabIndex={0}
        role="button"
        aria-label={`Carga ${carga.numero_carga} — ${carga.status}`}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isAdmin && onSelect && (
                <div onClick={(e) => { e.stopPropagation(); onSelect(carga.numero_carga); }}>
                  <Checkbox
                    checked={isSelected}
                    aria-label={`Selecionar carga ${carga.numero_carga}`}
                  />
                </div>
              )}
              <Package className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">CARGA {carga.numero_carga}</h3>
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
          <span className="text-sm">{carga.tipo_temperatura}</span>
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
