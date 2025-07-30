import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Ship, 
  Package, 
  Calendar, 
  MapPin, 
  Thermometer, 
  FileText, 
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';

interface CargoDetailsProps {
  cargo: {
    id: string;
    numero: string;
    mawb?: string;
    hawb?: string;
    status: string;
    origem: { nome: string };
    destino: { nome: string };
    dataChegadaPrevista: string;
    temperatura?: string;
    sosVinculadas: Array<{
      id: string;
      salesOrder: string;
      cliente: string;
      produtos: string;
      statusAtual: string;
      trackingNumbers?: string;
      prioridade: 'high' | 'normal' | 'low';
    }>;
    historico: Array<{
      id: string;
      evento: string;
      dataEvento: string;
      detalhes?: any;
      fonte?: string;
    }>;
  };
  onClose: () => void;
}

const CargoDetails: React.FC<CargoDetailsProps> = ({ cargo, onClose }) => {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'embarcado':
      case 'em trânsito':
        return <Truck className="h-4 w-4 text-status-transit" />;
      case 'chegada prevista':
        return <Clock className="h-4 w-4 text-status-shipping" />;
      case 'entregue':
        return <CheckCircle className="h-4 w-4 text-status-delivered" />;
      default:
        return <Ship className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'high':
        return <Badge className="bg-priority-high text-white">Alta</Badge>;
      case 'normal':
        return <Badge variant="outline">Normal</Badge>;
      case 'low':
        return <Badge className="bg-priority-low text-white">Baixa</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDetails = (detalhes: any) => {
    if (!detalhes || typeof detalhes !== 'object') return '';
    
    const formatters: { [key: string]: (value: any) => string } = {
      porto: (value) => `Aeroporto: ${value}`,
      aeroporto: (value) => `Aeroporto: ${value}`,
      status: (value) => {
        const statusMap: { [key: string]: string } = {
          'Navegando': 'Status: Em voo',
          'Em voo': 'Status: Em voo'
        };
        return statusMap[value] || `Status: ${value}`;
      },
      nova_data: (value) => `Nova previsão: ${new Date(value).toLocaleDateString('pt-BR')}`,
      temperatura: (value) => `Temperatura: ${value}°C`,
      localizacao: (value) => `Localização: ${value}`,
      observacoes: (value) => `Observações: ${value}`
    };

    return Object.entries(detalhes)
      .map(([key, value]) => {
        const formatter = formatters[key];
        return formatter ? formatter(value) : `${key}: ${value}`;
      })
      .join(' • ');
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-logistics">
          <div className="flex items-center gap-3">
            <Ship className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Carga {cargo.numero}</h2>
              <p className="text-sm text-muted-foreground">
                {cargo.mawb && `MAWB: ${cargo.mawb}`} {cargo.hawb && `| HAWB: ${cargo.hawb}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Cargo Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-status-shipping" />
                    Rota
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="font-medium">{cargo.origem.nome}</div>
                    <div className="text-muted-foreground">↓</div>
                    <div className="font-medium">{cargo.destino.nome}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-status-transit" />
                    Chegada Prevista
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {new Date(cargo.dataChegadaPrevista).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.ceil((new Date(cargo.dataChegadaPrevista).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {cargo.temperatura && <Thermometer className="h-4 w-4 text-temp-cold" />}
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-status-transit text-status-transit-foreground mb-2">
                    {cargo.status}
                  </Badge>
                  {cargo.temperatura && (
                    <div className="text-xs text-muted-foreground capitalize">
                      {cargo.temperatura}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* SOs Vinculadas */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Sales Orders Vinculadas ({cargo.sosVinculadas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SO</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produtos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cargo.sosVinculadas.map((so) => (
                      <TableRow key={so.id}>
                        <TableCell className="font-medium">{so.salesOrder}</TableCell>
                        <TableCell>{so.cliente}</TableCell>
                        <TableCell className="max-w-xs truncate">{so.produtos}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(so.statusAtual)}
                            <span className="text-sm">{so.statusAtual}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {so.trackingNumbers || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(so.prioridade)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Histórico de Eventos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cargo.historico.map((evento, index) => (
                    <div key={evento.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-primary rounded-full"></div>
                        {index < cargo.historico.length - 1 && (
                          <div className="w-0.5 h-12 bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{evento.evento}</h4>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(evento.dataEvento)}
                          </span>
                        </div>
                        {evento.detalhes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDetails(evento.detalhes)}
                          </p>
                        )}
                        {evento.fonte && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {evento.fonte}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CargoDetails;