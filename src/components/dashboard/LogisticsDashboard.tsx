import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Ship, 
  Package, 
  Map, 
  RefreshCw, 
  Download,
  Globe,
  TrendingUp,
  LogOut,
  User,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

import Overview from './Overview';
import SOTable from './SOTable';
import CargoMap from './CargoMap';
import CargoDetails from './CargoDetails';
import NotificationCenter from './NotificationCenter';
import SODetails from './SODetails';
import Analytics from './Analytics';
import AdvancedFilters from './AdvancedFilters';

interface DashboardData {
  overview: {
    activeSOs: number;
    inTransit: number;
    expectedArrivals: number;
    deliveryTrend: Array<{ date: string; deliveries: number; }>;
    criticalShipments: number;
  };
  sos: Array<{
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
  }>;
  cargas: Array<{
    id: string;
    numero: string;
    origem: { lat: number; lng: number; nome: string };
    destino: { lat: number; lng: number; nome: string };
    status: string;
    temperatura?: string;
    dataChegadaPrevista: string;
    sosVinculadas: number;
    mawb?: string;
    hawb?: string;
  }>;
}

const LogisticsDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DashboardData>({
    overview: {
      activeSOs: 0,
      inTransit: 0,
      expectedArrivals: 0,
      deliveryTrend: [],
      criticalShipments: 0
    },
    sos: [],
    cargas: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedCargo, setSelectedCargo] = useState<any>(null);
  const [selectedSO, setSelectedSO] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [filteredSOs, setFilteredSOs] = useState<any[]>([]);
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const { toast } = useToast();

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load real data from Supabase
      const { data: enviosData, error: enviosError } = await supabase
        .from('envios_processados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (enviosError) throw enviosError;

      // Load cargas data
      const { data: cargasData, error: cargasError } = await supabase
        .from('cargas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (cargasError) throw cargasError;

      // Transform envios data to SO format
      const transformedSOs = enviosData?.map((envio) => ({
        id: envio.id.toString(),
        salesOrder: envio.sales_order,
        cliente: envio.cliente,
        produtos: envio.produtos || '',
        statusAtual: envio.status_atual,
        statusCliente: envio.status_cliente,
        ultimaLocalizacao: envio.ultima_localizacao || '',
        dataUltimaAtualizacao: envio.data_ultima_atualizacao || envio.updated_at,
        temperatura: (Math.random() > 0.7 ? 'cold' : Math.random() > 0.5 ? 'controlled' : 'ambient') as 'cold' | 'ambient' | 'controlled',
        prioridade: (Math.random() > 0.8 ? 'high' : Math.random() > 0.6 ? 'normal' : 'low') as 'high' | 'normal' | 'low',
        trackingNumbers: envio.tracking_numbers
      })) || [];

      // Transform cargas data with realistic coordinates
      const transformedCargas = cargasData?.map((carga) => ({
        id: carga.id,
        numero: carga.numero_carga?.toString() || '',
        origem: {
          lat: -23.5505 + (Math.random() - 0.5) * 5,
          lng: -46.6333 + (Math.random() - 0.5) * 10,
          nome: 'São Paulo, BR'
        },
        destino: {
          lat: 40.7128 + (Math.random() - 0.5) * 10,
          lng: -74.0060 + (Math.random() - 0.5) * 20,
          nome: 'Nova York, EUA'
        },
        status: carga.status || 'Em Trânsito',
        temperatura: carga.tipo_temperatura,
        dataChegadaPrevista: carga.data_chegada_prevista || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        sosVinculadas: Math.floor(Math.random() * 10) + 1,
        mawb: carga.mawb,
        hawb: carga.hawb
      })) || [];

      // Calculate overview metrics
      const activeSOs = transformedSOs.length;
      const inTransit = transformedSOs.filter(so => so.statusCliente === 'Em Trânsito').length;
      const expectedArrivals = transformedCargas.length;
      const criticalShipments = transformedSOs.filter(so => so.prioridade === 'high').length;

      // Generate trend data
      const deliveryTrend = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        deliveries: Math.floor(Math.random() * 20) + 5
      }));

      // Extract unique clients and statuses for filters
      const uniqueClients = Array.from(new Set(transformedSOs.map(so => so.cliente))).sort();
      const uniqueStatuses = Array.from(new Set(transformedSOs.map(so => so.statusCliente))).sort();

      setData({
        overview: {
          activeSOs,
          inTransit,
          expectedArrivals,
          deliveryTrend,
          criticalShipments
        },
        sos: transformedSOs,
        cargas: transformedCargas
      });

      setFilteredSOs(transformedSOs);
      setAvailableClients(uniqueClients);
      setAvailableStatuses(uniqueStatuses);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSOClick = (so: any) => {
    setSelectedSO(so);
  };

  const loadNotificationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');

      if (error) throw error;
      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  // Load notification count on mount
  useEffect(() => {
    loadNotificationCount();
  }, []);

  const handleFiltersChange = (filters: any) => {
    let filtered = [...data.sos];

    // Filter by date range
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(so => {
        const soDate = new Date(so.dataUltimaAtualizacao);
        return soDate >= startDate && soDate <= endDate;
      });
    }

    // Filter by selected clients
    if (filters.selectedClients.length > 0) {
      filtered = filtered.filter(so => filters.selectedClients.includes(so.cliente));
    }

    // Filter by selected statuses
    if (filters.selectedStatuses.length > 0) {
      filtered = filtered.filter(so => filters.selectedStatuses.includes(so.statusCliente));
    }

    // Filter by tracking search
    if (filters.trackingSearch.trim()) {
      const searchTerm = filters.trackingSearch.toLowerCase();
      filtered = filtered.filter(so => 
        so.trackingNumbers?.toLowerCase().includes(searchTerm) ||
        so.salesOrder.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredSOs(filtered);
  };

  const handleCargoClick = async (cargo: any) => {
    try {
      // Load detailed cargo data with SOs and history
      const cargoDetails = {
        ...cargo,
        sosVinculadas: data.sos.slice(0, cargo.sosVinculadas).map(so => ({
          ...so,
          prioridade: so.prioridade as 'high' | 'normal' | 'low'
        })),
        historico: [
          {
            id: '1',
            evento: 'Carga Embarcada',
            dataEvento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            detalhes: { porto: cargo.origem.nome },
            fonte: 'Sistema Portuário'
          },
          {
            id: '2',
            evento: 'Em Trânsito Internacional',
            dataEvento: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            detalhes: { status: 'Navegando' },
            fonte: 'Rastreamento Marítimo'
          },
          {
            id: '3',
            evento: 'Chegada Prevista Atualizada',
            dataEvento: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            detalhes: { nova_data: cargo.dataChegadaPrevista },
            fonte: 'Sistema Automático'
          }
        ]
      };

      setSelectedCargo(cargoDetails);
    } catch (error) {
      console.error('Error loading cargo details:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da carga.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-logistics">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Global Logi-Sight</h1>
                <p className="text-muted-foreground">Dashboard de Logística Internacional</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              
              <Badge variant="outline" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-status-delivered rounded-full animate-pulse"></div>
                Sistema Online
              </Badge>

              {/* Notification Bell */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadDashboardData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="sos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Sales Orders
            </TabsTrigger>
            <TabsTrigger value="cargas" className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Cargas
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Overview data={data.overview} />
          </TabsContent>

          <TabsContent value="sos">
            <div className="space-y-6">
              <AdvancedFilters
                onFiltersChange={handleFiltersChange}
                availableClients={availableClients}
                availableStatuses={availableStatuses}
              />
              <SOTable 
                data={filteredSOs} 
                onSOClick={handleSOClick}
              />
            </div>
          </TabsContent>

          <TabsContent value="cargas">
            <CargoMap 
              cargas={data.cargas}
              onCargoClick={handleCargoClick}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>
        </Tabs>
      </div>

      {/* SO Details Modal */}
      {selectedSO && (
        <SODetails 
          so={selectedSO}
          onClose={() => setSelectedSO(null)}
        />
      )}

      {/* Cargo Details Modal */}
      {selectedCargo && (
        <CargoDetails 
          cargo={selectedCargo}
          onClose={() => setSelectedCargo(null)}
        />
      )}

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        unreadCount={unreadNotifications}
        onCountUpdate={setUnreadNotifications}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Carregando dados...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LogisticsDashboard;