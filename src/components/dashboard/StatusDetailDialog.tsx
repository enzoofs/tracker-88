import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSLACalculator } from '@/hooks/useSLACalculator';

interface SO {
  salesOrder: string;
  cliente: string;
  statusAtual: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  isDelivered: boolean;
  trackingNumbers?: string;
  valorTotal?: number;
}

interface StatusDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sos: SO[];
}

export const StatusDetailDialog: React.FC<StatusDetailDialogProps> = ({
  isOpen,
  onClose,
  title,
  sos
}) => {
  const getUrgencyBadge = (so: SO) => {
    const sla = useSLACalculator(so);
    if (!sla) return null;

    const variant = 
      sla.urgency === 'overdue' ? 'destructive' :
      sla.urgency === 'critical' ? 'destructive' :
      sla.urgency === 'warning' ? 'secondary' :
      'default';

    return (
      <Badge variant={variant} className="text-xs">
        {sla.urgency === 'overdue' ? `${Math.abs(sla.daysRemaining)}d atraso` : `${sla.daysRemaining}d`}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{title} ({sos.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {sos.map((so) => (
              <div key={so.salesOrder} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-base">{so.salesOrder}</p>
                      {getUrgencyBadge(so)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{so.cliente}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {so.statusAtual}
                      </Badge>
                      {so.valorTotal && (
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(so.valorTotal)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Atualizado em:</p>
                    <p className="font-medium">{new Date(so.dataUltimaAtualizacao).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                {so.trackingNumbers && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Tracking: {so.trackingNumbers}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
