import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Search, Filter, Thermometer, AlertTriangle, Eye, ChevronUp, ChevronDown } from 'lucide-react';

interface SO {
  id: string;
  salesOrder: string;
  cliente: string;
  produtos: string;
  statusAtual: string;
  statusCliente: string | null;
  ultimaLocalizacao: string;
  dataUltimaAtualizacao: string;
  temperatura?: 'cold' | 'ambient' | 'controlled';
  prioridade: 'high' | 'normal' | 'low';
  trackingNumbers?: string;
}

interface SOTableProps {
  data: SO[];
  onSOClick: (so: SO) => void;
  isLoading?: boolean;
}

const SOTable: React.FC<SOTableProps> = ({ data, onSOClick, isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clienteFilter, setClienteFilter] = useState('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<keyof SO | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const getStatusVariant = (status: string | null) => {
    if (!status) return 'default';
    
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

  const handleSort = (column: keyof SO) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Debug logs
  console.log('📊 SOTable recebeu:', data.length, 'registros');
  console.log('📋 Dados brutos:', data);
  
  const filteredData = data.filter(so => {
    const matchesSearch = 
      so.salesOrder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.produtos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.ultimaLocalizacao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Simplificar comparação de status - normalizar ambos os lados
    const statusValue = (so.statusCliente || '').trim().toLowerCase();
    const filterValue = statusFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || statusValue === filterValue;
    
    const matchesCliente = clienteFilter === 'all' || so.cliente === clienteFilter;
    const matchesPrioridade = prioridadeFilter === 'all' || so.prioridade === prioridadeFilter;
    
    return matchesSearch && matchesStatus && matchesCliente && matchesPrioridade;
  }).sort((a, b) => {
    if (!sortBy) return 0;
    
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const result = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? result : -result;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
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

  const isNewSO = (so: SO) => {
    const createdAt = new Date(so.dataUltimaAtualizacao);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation <= 24; // Consider new if created in last 24 hours
  };

  const uniqueClientes = [...new Set(data.map(so => so.cliente))];
  // Simplificar - usar apenas valores reais de statusCliente, filtrar nulls/vazios
  const uniqueStatuses = [...new Set(data.map(so => so.statusCliente).filter(s => s && s.trim()))];
  const uniquePrioridades = [...new Set(data.map(so => so.prioridade))];
  
  console.log('🔍 Status únicos encontrados:', uniqueStatuses);
  console.log('✅ Dados após filtragem:', filteredData.length);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Sales Orders ({filteredData.length})
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SO, cliente, produto ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 transition-all duration-300 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">Todos os Status</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status.toLowerCase()}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={clienteFilter} onValueChange={setClienteFilter}>
              <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {uniqueClientes.map(cliente => (
                  <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger className="transition-all duration-300 hover:border-primary/50">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                {uniquePrioridades.map(prioridade => (
                  <SelectItem key={prioridade} value={prioridade}>
                    <div className="flex items-center gap-2">
                      {prioridade === 'high' && <AlertTriangle className="h-4 w-4 text-priority-high" />}
                      {prioridade === 'high' ? 'Alta' : prioridade === 'normal' ? 'Normal' : 'Baixa'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setClienteFilter('all');
                setPrioridadeFilter('all');
              }}
              className="transition-all duration-300 hover:bg-muted/50"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('salesOrder')}
                >
                  <div className="flex items-center gap-1">
                    SO
                    {sortBy === 'salesOrder' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('cliente')}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    {sortBy === 'cliente' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('produtos')}
                >
                  <div className="flex items-center gap-1">
                    Produtos
                    {sortBy === 'produtos' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('statusCliente')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'statusCliente' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('ultimaLocalizacao')}
                >
                  <div className="flex items-center gap-1">
                    Localização
                    {sortBy === 'ultimaLocalizacao' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                  onClick={() => handleSort('dataUltimaAtualizacao')}
                >
                  <div className="flex items-center gap-1">
                    Última Atualização
                    {sortBy === 'dataUltimaAtualizacao' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-center">Indicadores</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((so) => {
                const delayed = isDelayed(so);
                const arrivingToday = isArrivingToday(so);
                const isNew = isNewSO(so);
                
                 return (
                   <TableRow 
                     key={so.id}
                     className={`hover:bg-muted/50 cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-sm ${
                       delayed ? 'bg-destructive/10 border-l-4 border-l-destructive animate-pulse' : ''
                     } ${arrivingToday ? 'bg-status-production/10 border-l-4 border-l-status-production' : ''} ${
                       isNew ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                     }`}
                     onClick={() => onSOClick(so)}
                   >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {so.salesOrder}
                      {isNew && (
                        <Badge className="bg-primary text-primary-foreground text-xs animate-pulse">
                          NOVO
                        </Badge>
                      )}
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
                    {so.produtos && so.produtos.length > 0 ? so.produtos : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={getStatusBadgeClass(getStatusVariant(so.statusCliente))}
                      >
                        {so.statusCliente || 'Sem Status'}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </div>
        
        {!isLoading && filteredData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground animate-fade-in">
            <div className="flex flex-col items-center gap-3">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">Nenhuma SO encontrada</p>
              <p className="text-sm">Tente ajustar os filtros para encontrar resultados.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SOTable;