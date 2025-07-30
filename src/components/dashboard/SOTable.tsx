import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Thermometer, AlertTriangle, Eye } from 'lucide-react';

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

interface SOTableProps {
  data: SO[];
  onSOClick: (so: SO) => void;
}

const SOTable: React.FC<SOTableProps> = ({ data, onSOClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clienteFilter, setClienteFilter] = useState('all');

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'em produção':
        return 'production';
      case 'em importação':
        return 'shipping';
      case 'em trânsito':
        return 'transit';
      case 'entregue':
        return 'delivered';
      default:
        return 'default';
    }
  };

  const getStatusBadgeClass = (variant: string) => {
    switch (variant) {
      case 'production':
        return 'bg-status-production text-status-production-foreground';
      case 'shipping':
        return 'bg-status-shipping text-status-shipping-foreground';
      case 'transit':
        return 'bg-status-transit text-status-transit-foreground';
      case 'delivered':
        return 'bg-status-delivered text-status-delivered-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (prioridade: string) => {
    if (prioridade === 'high') {
      return <AlertTriangle className="h-4 w-4 text-priority-high" />;
    }
    return null;
  };

  const getTemperatureIcon = (temperatura?: string) => {
    if (!temperatura) return null;
    
    const colorClass = temperatura === 'cold' ? 'text-temp-cold' : 
                      temperatura === 'controlled' ? 'text-temp-controlled' : 
                      'text-temp-ambient';
    
    return <Thermometer className={`h-4 w-4 ${colorClass}`} />;
  };

  const filteredData = data.filter(so => {
    const matchesSearch = 
      so.salesOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.produtos.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || so.statusCliente === statusFilter;
    const matchesCliente = clienteFilter === 'all' || so.cliente === clienteFilter;
    
    return matchesSearch && matchesStatus && matchesCliente;
  });

  const isDelayed = (so: SO) => {
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate > 7; // Consider delayed if no update for more than 7 days
  };

  const isArrivingToday = (so: SO) => {
    // Check if SO is arriving today based on data_ultima_atualizacao
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const today = new Date();
    return lastUpdate.toDateString() === today.toDateString() && so.statusCliente === 'Em Trânsito';
  };

  const uniqueClientes = [...new Set(data.map(so => so.cliente))];
  const uniqueStatuses = [...new Set(data.map(so => so.statusCliente))];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Sales Orders ({filteredData.length})
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SO, cliente ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {uniqueClientes.map(cliente => (
                <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SO</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead className="text-center">Indicadores</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((so) => {
                const delayed = isDelayed(so);
                const arrivingToday = isArrivingToday(so);
                
                return (
                  <TableRow 
                    key={so.id}
                    className={`hover:bg-muted/50 cursor-pointer transition-smooth ${
                      delayed ? 'bg-destructive/10 border-l-4 border-l-destructive' : ''
                    }`}
                    onClick={() => onSOClick(so)}
                  >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {so.salesOrder}
                      {delayed && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          ATRASADO
                        </Badge>
                      )}
                      {arrivingToday && (
                        <Badge className="bg-status-production text-status-production-foreground text-xs animate-bounce">
                          HOJE
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{so.cliente}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {so.produtos}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={getStatusBadgeClass(getStatusVariant(so.statusCliente))}
                      >
                        {so.statusCliente}
                      </Badge>
                      {so.temperatura === 'cold' && (
                        <span className="text-temp-cold text-sm">❄️</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {so.ultimaLocalizacao || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(so.dataUltimaAtualizacao).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {getPriorityIcon(so.prioridade)}
                      {getTemperatureIcon(so.temperatura)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSOClick(so);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma SO encontrada com os filtros aplicados.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SOTable;