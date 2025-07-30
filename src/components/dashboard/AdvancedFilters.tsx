import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Calendar,
  Filter,
  X,
  Search,
  Users,
  Package,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  selectedClients: string[];
  selectedStatuses: string[];
  trackingSearch: string;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  availableClients: string[];
  availableStatuses: string[];
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ 
  onFiltersChange, 
  availableClients, 
  availableStatuses 
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    selectedClients: [],
    selectedStatuses: [],
    trackingSearch: ''
  });

  const [showClientSelect, setShowClientSelect] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClientSelect = (client: string) => {
    const newSelectedClients = filters.selectedClients.includes(client)
      ? filters.selectedClients.filter(c => c !== client)
      : [...filters.selectedClients, client];
    
    updateFilters({ selectedClients: newSelectedClients });
  };

  const handleStatusSelect = (status: string) => {
    const newSelectedStatuses = filters.selectedStatuses.includes(status)
      ? filters.selectedStatuses.filter(s => s !== status)
      : [...filters.selectedStatuses, status];
    
    updateFilters({ selectedStatuses: newSelectedStatuses });
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      selectedClients: [],
      selectedStatuses: [],
      trackingSearch: ''
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Entregue':
        return <CheckCircle className="h-3 w-3 text-status-delivered" />;
      case 'Em Trânsito':
        return <Package className="h-3 w-3 text-status-transit" />;
      case 'Em Produção':
        return <AlertCircle className="h-3 w-3 text-status-production" />;
      default:
        return <Package className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const activeFiltersCount = 
    filters.selectedClients.length + 
    filters.selectedStatuses.length + 
    (filters.trackingSearch ? 1 : 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} ativos
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Período
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                Data Inicial
              </Label>
              <Input
                id="startDate"
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => updateFilters({
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                Data Final
              </Label>
              <Input
                id="endDate"
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => updateFilters({
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Client Multi-Select */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Clientes
          </Label>
          
          <Popover open={showClientSelect} onOpenChange={setShowClientSelect}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {filters.selectedClients.length === 0 ? (
                  <span className="text-muted-foreground">Selecionar clientes...</span>
                ) : (
                  <span>{filters.selectedClients.length} cliente(s) selecionado(s)</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup>
                    {availableClients.map((client) => (
                      <CommandItem
                        key={client}
                        onSelect={() => handleClientSelect(client)}
                        className="flex items-center gap-2"
                      >
                        <div className={`h-4 w-4 border rounded-sm ${
                          filters.selectedClients.includes(client)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {filters.selectedClients.includes(client) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span>{client}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Clients */}
          {filters.selectedClients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.selectedClients.map((client) => (
                <Badge
                  key={client}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {client}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleClientSelect(client)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Status Multi-Select */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Status
          </Label>
          
          <Popover open={showStatusSelect} onOpenChange={setShowStatusSelect}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                {filters.selectedStatuses.length === 0 ? (
                  <span className="text-muted-foreground">Selecionar status...</span>
                ) : (
                  <span>{filters.selectedStatuses.length} status selecionado(s)</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {availableStatuses.map((status) => (
                      <CommandItem
                        key={status}
                        onSelect={() => handleStatusSelect(status)}
                        className="flex items-center gap-2"
                      >
                        <div className={`h-4 w-4 border rounded-sm ${
                          filters.selectedStatuses.includes(status)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {filters.selectedStatuses.includes(status) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <span>{status}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Selected Statuses */}
          {filters.selectedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.selectedStatuses.map((status) => (
                <Badge
                  key={status}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {getStatusIcon(status)}
                  {status}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleStatusSelect(status)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Tracking Search */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4" />
            Busca por Tracking
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite o número de tracking..."
              value={filters.trackingSearch}
              onChange={(e) => updateFilters({ trackingSearch: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;