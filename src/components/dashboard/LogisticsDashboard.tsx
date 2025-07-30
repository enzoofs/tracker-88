// Dashboard principal de logística - sem CargoMap
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
  const [activeTab, setActiveTab] = useState('sos');
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

      // Load cargo-SO relationships
      const { data: cargoSOsData, error: cargoSOsError } = await supabase
        .from('carga_sales_orders')
        .select('numero_carga, so_number')
        .order('numero_carga');

      if (cargoSOsError) throw cargoSOsError;

      // Transform cargas data with realistic coordinates
      const transformedCargas = cargasData?.map((carga) => {
        // Count SOs linked to this cargo
        const linkedSOs = cargoSOsData?.filter(cso => cso.numero_carga === carga.numero_carga) || [];
        
        return {
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
          sosVinculadas: linkedSOs.length,
          mawb: carga.mawb,
          hawb: carga.hawb
        };
      }) || [];

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


    setFilteredSOs(filtered);
  };

  const handleCargoClick = async (cargo: any) => {
    try {
      console.log(`🔍 Carregando detalhes da carga ${cargo.numero}...`);
      
      // Load cargo-SO relationships - SEM LIMIT para pegar todas as SOs
      const { data: cargoSORelations, error: cargoSOError } = await supabase
        .from('carga_sales_orders')
        .select('so_number')
        .eq('numero_carga', parseInt(cargo.numero));

      if (cargoSOError) throw cargoSOError;

      console.log(`📦 Encontradas ${cargoSORelations?.length || 0} SOs vinculadas à carga ${cargo.numero}`);

      // Get SO numbers for this cargo
      const soNumbers = cargoSORelations?.map(rel => rel.so_number) || [];
      
      if (soNumbers.length === 0) {
        console.warn(`⚠️ Nenhuma SO encontrada para a carga ${cargo.numero}`);
      }
      
      // Load SO data - SEM LIMIT para pegar todas as SOs vinculadas
      const { data: enviosData, error: enviosError } = await supabase
        .from('envios_processados')
        .select('*')
        .in('sales_order', soNumbers);

      if (enviosError) throw enviosError;

      console.log(`✅ Carregados dados de ${enviosData?.length || 0} SOs da tabela envios_processados`);

      const linkedSOs = enviosData?.map(envio => ({
        id: envio.id.toString(),
        salesOrder: envio.sales_order,
        cliente: envio.cliente,
        produtos: envio.produtos || '',
        statusAtual: envio.status_atual,
        trackingNumbers: envio.tracking_numbers,
        prioridade: (Math.random() > 0.8 ? 'high' : Math.random() > 0.6 ? 'normal' : 'low') as 'high' | 'normal' | 'low'
      })) || [];

      // Load detailed cargo data with SOs and history
      const cargoDetails = {
        ...cargo,
        sosVinculadas: linkedSOs,
        historico: [
            {
              id: '1',
              evento: 'Carga Embarcada',
              dataEvento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              detalhes: {},
              fonte: 'Sistema de Controle'
            },
            {
              id: '2',
              evento: 'Em Trânsito Internacional',
              dataEvento: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              detalhes: {},
              fonte: 'Rastreamento Internacional'
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
    <div className="min-h-screen bg-gradient-dark">
      {/* Modern Tech Header */}
      <div className="border-b border-border/50 bg-gradient-tech/5 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-tech shadow-tech">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-tech text-foreground">
                  Global Logistics
                </h1>
                <p className="text-muted-foreground font-medium">
                  Rastreamento Inteligente de Cargas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell with Glow */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNotifications(true)}
                  className="p-3 rounded-xl hover:bg-primary/10 transition-all duration-300 group"
                >
                  <Bell className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                  {unreadNotifications > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-gradient-alert glow-accent animate-glow-pulse"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl glass">
                <div className="w-8 h-8 rounded-lg bg-gradient-tech flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-tech text-foreground">Admin User</div>
                  <div className="text-xs text-muted-foreground">Administrador</div>
                </div>
              </div>

              {/* Logout Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="px-6 py-2 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Enhanced Spacing */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Modern Tab Navigation */}
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto glass p-1 rounded-2xl">
            <TabsTrigger 
              value="sos" 
              className="rounded-xl font-tech data-[state=active]:bg-gradient-tech data-[state=active]:text-white data-[state=active]:shadow-tech transition-all duration-300"
            >
              Sales Orders
            </TabsTrigger>
            <TabsTrigger 
              value="overview"
              className="rounded-xl font-tech data-[state=active]:bg-gradient-tech data-[state=active]:text-white data-[state=active]:shadow-tech transition-all duration-300"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="cargas"
              className="rounded-xl font-tech data-[state=active]:bg-gradient-tech data-[state=active]:text-white data-[state=active]:shadow-tech transition-all duration-300"
            >
              Cargas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sos" className="animate-fade-in">
            <div className="space-y-8">
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

          <TabsContent value="overview" className="animate-fade-in">
            <Overview data={data.overview} />
          </TabsContent>

          <TabsContent value="cargas" className="space-y-8 animate-fade-in">
            <div className="grid gap-6">
              {data.cargas.map((cargo, index) => (
                <Card 
                  key={cargo.id} 
                  className="glass hover:shadow-tech hover:scale-[1.02] transition-all duration-300 cursor-pointer group animate-fade-in border-border/50"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleCargoClick(cargo)}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl ${cargo.temperatura ? 'bg-gradient-tech' : 'bg-gradient-tech'} shadow-tech`}>
                          <Ship className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-tech text-foreground group-hover:text-primary transition-colors">
                            Carga {cargo.numero}
                          </h3>
                          <p className="text-muted-foreground font-medium mt-1">
                            {cargo.origem.nome} → {cargo.destino.nome}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge className="bg-gradient-tech text-white mb-3 px-4 py-2 rounded-xl font-medium shadow-tech">
                          {cargo.status}
                        </Badge>
                        <p className="text-mono-metric text-foreground font-semibold">
                          {cargo.sosVinculadas} SOs vinculadas
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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

      {/* Loading Overlay with Modern Design */}
      {loading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-lg z-40 flex items-center justify-center">
          <Card className="glass p-8 border-border/50">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="font-tech text-lg text-foreground">Carregando dados...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LogisticsDashboard;