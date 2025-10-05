import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { sanitizeSearchQuery, isValidDate } from '@/lib/security';
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
  Calendar as CalendarIcon,
  Filter,
  X,
  Search,
  Users,
  Package,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
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
      start: '',
      end: ''
    },
    selectedClients: [],
    selectedStatuses: [],
    trackingSearch: ''
  });

  const [showClientSelect, setShowClientSelect] = useState(false);
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    // Validate date inputs
    if (newFilters.dateRange) {
      const { start, end } = newFilters.dateRange;
      if (start && !isValidDate(start)) return;
      if (end && !isValidDate(end)) return;
      if (start && end && new Date(start) > new Date(end)) return;
    }
    
    // Sanitize tracking search
    if (newFilters.trackingSearch !== undefined) {
      newFilters.trackingSearch = sanitizeSearchQuery(newFilters.trackingSearch);
    }
    
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
        start: '',
        end: ''
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
      <CardContent className="space-y-4">
        {/* Compact Row 1: Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Data Inicial
            </Label>
            <Popover open={showStartDatePicker} onOpenChange={setShowStartDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal text-sm mt-1 cursor-pointer"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {filters.dateRange.start ? 
                    new Date(filters.dateRange.start).toLocaleDateString('pt-BR') : 
                    'Selecionar data'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.start ? new Date(filters.dateRange.start) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      updateFilters({
                        dateRange: { ...filters.dateRange, start: date.toISOString().split('T')[0] }
                      });
                      setShowStartDatePicker(false);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Data Final
            </Label>
            <Popover open={showEndDatePicker} onOpenChange={setShowEndDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal text-sm mt-1 cursor-pointer"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {filters.dateRange.end ? 
                    new Date(filters.dateRange.end).toLocaleDateString('pt-BR') : 
                    'Selecionar data'
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.end ? new Date(filters.dateRange.end) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      updateFilters({
                        dateRange: { ...filters.dateRange, end: date.toISOString().split('T')[0] }
                      });
                      setShowEndDatePicker(false);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Compact Row 2: Client and Status Multi-Select */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Client Multi-Select */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              Clientes
            </Label>
          
            <Popover open={showClientSelect} onOpenChange={setShowClientSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal text-sm h-8"
                >
                  {filters.selectedClients.length === 0 ? (
                    <span className="text-muted-foreground">Clientes...</span>
                  ) : (
                    <span>{filters.selectedClients.length} selecionado(s)</span>
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
              <div className="flex flex-wrap gap-1 mt-1">
                {filters.selectedClients.map((client) => (
                  <Badge
                    key={client}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1 text-xs"
                  >
                    {client.length > 12 ? `${client.substring(0, 12)}...` : client}
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

          {/* Status Multi-Select */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              Status
            </Label>
          
            <Popover open={showStatusSelect} onOpenChange={setShowStatusSelect}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal text-sm h-8"
                >
                  {filters.selectedStatuses.length === 0 ? (
                    <span className="text-muted-foreground">Status...</span>
                  ) : (
                    <span>{filters.selectedStatuses.length} selecionado(s)</span>
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
              <div className="flex flex-wrap gap-1 mt-1">
                {filters.selectedStatuses.map((status) => (
                  <Badge
                    key={status}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1 text-xs"
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
        </div>

      </CardContent>
    </Card>
  );
};

export default AdvancedFilters;