import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Ship, 
  Package, 
  Calendar, 
  MapPin, 
  Thermometer,
  Truck,
  Clock,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';
import Timeline from './Timeline';

interface CargoDetailsProps {
  cargo: {
    id: string;
    numero_carga: string;
    mawb?: string;
    hawb?: string;
    status: string;
    origem?: string;
    destino?: string;
    data_chegada_prevista?: string;
    tipo_temperatura?: string;
    transportadora?: string;
  };
  onClose: () => void;
}

const CargoDetails: React.FC<CargoDetailsProps> = ({ cargo, onClose }) => {
  const [sosVinculadas, setSosVinculadas] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCargoDetails();
  }, [cargo.numero_carga]);

  const loadCargoDetails = async () => {
    try {
      setLoading(true);

      // Buscar SOs vinculadas
      const { data: linkedSOs, error: soError } = await supabase
        .from('carga_sales_orders')
        .select('so_number')
        .eq('numero_carga', cargo.numero_carga);

      if (soError) throw soError;

      const soNumbers = linkedSOs?.map(link => link.so_number) || [];

      if (soNumbers.length > 0) {
        const { data: sosData, error: sosError } = await supabase
          .from('envios_processados')
          .select('*')
          .in('sales_order', soNumbers);

        if (sosError) throw sosError;
        setSosVinculadas(sosData || []);
      }

      // Buscar histórico da carga
      const { data: histData, error: histError } = await supabase
        .from('carga_historico')
        .select('*')
        .eq('numero_carga', cargo.numero_carga)
        .order('data_evento', { ascending: false });

      if (histError) throw histError;
      setHistorico(histData || []);

    } catch (error) {
      console.error('Erro ao carregar detalhes da carga:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'em trânsito':
        return <Truck className="h-4 w-4 text-yellow-500" />;
      case 'entregue':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Ship className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTotalValue = () => {
    return sosVinculadas.reduce((sum, so) => sum + (so.valor_total || 0), 0);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ship className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Carga {cargo.numero_carga}</h2>
              <p className="text-sm text-muted-foreground">
                {cargo.mawb && `MAWB: ${cargo.mawb}`} {cargo.hawb && cargo.mawb && '|'} {cargo.hawb && `HAWB: ${cargo.hawb}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Informações Gerais */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        Chegada Prevista
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {formatDate(cargo.data_chegada_prevista)}
                      </div>
                      {cargo.data_chegada_prevista && (
                        <div className="text-xs text-muted-foreground">
                          {Math.ceil((new Date(cargo.data_chegada_prevista).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Thermometer className="h-4 w-4 text-primary" />
                        Temperatura
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className="capitalize">
                        {cargo.tipo_temperatura || 'N/A'}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-2">
                        Status: {cargo.status}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        Rota
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm font-medium">
                        {cargo.origem || 'N/A'} → {cargo.destino || 'N/A'}
                      </div>
                      {cargo.transportadora && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Truck className="h-3 w-3" />
                          {cargo.transportadora}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* SOs Consolidadas */}
                <Card className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Sales Orders Consolidadas ({sosVinculadas.length})
                      </CardTitle>
                      <div className="text-sm font-medium">
                        Total: R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sosVinculadas.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SO</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Produtos</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tracking</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sosVinculadas.map((so) => (
                            <TableRow key={so.id}>
                              <TableCell className="font-medium">{so.sales_order}</TableCell>
                              <TableCell>{so.cliente}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {typeof so.produtos === 'string' ? so.produtos : JSON.stringify(so.produtos)}
                              </TableCell>
                              <TableCell>
                                R$ {(so.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(so.status_atual)}
                                  <span className="text-sm">{so.status_atual}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {so.tracking_numbers || 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhuma SO vinculada a esta carga
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Histórico da Carga */}
                {historico.length > 0 && (
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Histórico da Carga
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {historico.map((evento) => (
                          <div key={evento.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="mt-1">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium text-sm">{evento.evento}</h5>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(evento.data_evento)}
                                </span>
                              </div>
                              {evento.descricao && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {evento.descricao}
                                </p>
                              )}
                              {evento.localizacao && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {evento.localizacao}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargoDetails;
