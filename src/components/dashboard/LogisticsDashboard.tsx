// Dashboard principal de logística - sem CargoMap
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Ship, Package, Map, RefreshCw, Download, Globe, TrendingUp, LogOut, User, Bell, Plane, Box, Zap, Atom, Microscope, FileSpreadsheet, Moon, Sun } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTheme } from '@/components/auth/ThemeProvider';
import Overview from './Overview';
import SOTable from './SOTable';
import CargoDetails from './CargoDetails';
import NotificationCenter from './NotificationCenter';
import SODetails from './SODetails';
import Charts from './Charts';
import Reports from './Reports';
import ParticleBackground from '../ui/ParticleBackground';
interface DashboardData {
  overview: {
    activeSOs: number;
    inTransit: number;
    expectedArrivals: number;
    deliveryTrend: Array<{
      date: string;
      deliveries: number;
    }>;
    criticalShipments: number;
    statusCounts?: {
      emProducao: number;
      emImportacao: number;
      emTransito: number;
    };
  };
  sos: Array<{
    id: string;
    salesOrder: string;
    cliente: string;
    produtos: string;
    valorTotal?: number;
    statusAtual: string;
    ultimaLocalizacao: string;
    dataUltimaAtualizacao: string;
    erpOrder?: string;
    webOrder?: string;
    trackingNumbers?: string;
    isDelivered: boolean;
  }>;
  cargas: Array<{
    id: string;
    numero: string;
    origem: {
      lat: number;
      lng: number;
      nome: string;
    };
    destino: {
      lat: number;
      lng: number;
      nome: string;
    };
    status: string;
    temperatura?: string;
    dataChegadaPrevista: string;
    sosVinculadas: number;
    mawb?: string;
    hawb?: string;
    icon: {
      type: string;
      component: any;
    };
  }>;
}
const LogisticsDashboard: React.FC = () => {
  const {
    user,
    signOut
  } = useAuth();
  const { theme, setTheme } = useTheme();
  const [data, setData] = useState<DashboardData>({
    overview: {
      activeSOs: 0,
      inTransit: 0,
      expectedArrivals: 0,
      deliveryTrend: [],
      criticalShipments: 0,
      statusCounts: {
        emProducao: 0,
        emImportacao: 0,
        emTransito: 0
      }
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
  const [showDelivered, setShowDelivered] = useState(false);
  const [filteredSOs, setFilteredSOs] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const {
    toast
  } = useToast();
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load real data from Supabase
      const {
        data: enviosData,
        error: enviosError
      } = await supabase.from('envios_processados').select('*').order('created_at', {
        ascending: false
      }).limit(100);
      if (enviosError) throw enviosError;

      // Load cargas data
      const {
        data: cargasData,
        error: cargasError
      } = await supabase.from('cargas').select('*').order('created_at', {
        ascending: false
      }).limit(20);
      if (cargasError) throw cargasError;

      // Transform envios data to SO format
      const transformedSOs = enviosData?.map(envio => ({
        id: envio.id.toString(),
        salesOrder: envio.sales_order,
        cliente: envio.cliente,
        produtos: typeof envio.produtos === 'string' ? envio.produtos : JSON.stringify(envio.produtos || ''),
        valorTotal: envio.valor_total,
        statusAtual: envio.status_atual === 'Enviado' ? 'Em Importação' : envio.status_atual,
        ultimaLocalizacao: envio.ultima_localizacao || '',
        dataUltimaAtualizacao: envio.data_ultima_atualizacao || envio.updated_at,
        erpOrder: envio.erp_order,
        webOrder: envio.web_order,
        trackingNumbers: Array.isArray(envio.tracking_numbers) ? envio.tracking_numbers.join(', ') : envio.tracking_numbers || '',
        isDelivered: envio.status_atual === 'Entregue'
      })) || [];

      // Load cargo-SO relationships
      const {
        data: cargoSOsData,
        error: cargoSOsError
      } = await supabase.from('carga_sales_orders').select('numero_carga, so_number').order('numero_carga');
      if (cargoSOsError) throw cargoSOsError;

      // Transform cargas data with realistic coordinates
      const transformedCargas = cargasData?.map(carga => {
        // Count SOs linked to this cargo - get actual count from database
        const linkedSOs = cargoSOsData?.filter(cso => cso.numero_carga === carga.numero_carga) || [];
        
        // Generate random icon for each cargo
        const iconOptions = [
          { type: 'plane', component: Plane },
          { type: 'box', component: Box },
          { type: 'zap', component: Zap },
          { type: 'atom', component: Atom },
          { type: 'microscope', component: Microscope }
        ];
        const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)];
        
        return {
          id: carga.id,
          numero: carga.numero_carga?.toString() || '',
          origem: {
            lat: -23.5505 + (Math.random() - 0.5) * 5,
            lng: -46.6333 + (Math.random() - 0.5) * 10,
            nome: 'Centro de Distribuição'
          },
          destino: {
            lat: 40.7128 + (Math.random() - 0.5) * 10,
            lng: -74.0060 + (Math.random() - 0.5) * 20,
            nome: 'Destino Final'
          },
          status: carga.status || 'Em Trânsito',
          temperatura: carga.tipo_temperatura,
          dataChegadaPrevista: carga.data_chegada_prevista || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          sosVinculadas: linkedSOs.length,
          mawb: carga.mawb,
          hawb: carga.hawb,
          icon: randomIcon
        };
      }) || [];

      // Calculate overview metrics
      const activeSOs = transformedSOs.length;
      const inTransit = transformedSOs.filter(so => so.statusAtual === 'Em Trânsito').length;
      const expectedArrivals = transformedCargas.length;
      const criticalShipments = transformedSOs.filter(so => !so.isDelivered && so.ultimaLocalizacao).length;
      
      // Calculate real status counts
      const statusCounts = {
        emProducao: transformedSOs.filter(so => so.statusAtual === 'Em Produção').length,
        emImportacao: transformedSOs.filter(so => 
          so.statusAtual === 'Em Importação' ||
          so.statusAtual === 'Enviado' ||
          so.statusAtual === 'No Armazém' || 
          so.statusAtual === 'Voo Internacional' ||
          so.statusAtual === 'Desembaraço'
        ).length,
        emTransito: transformedSOs.filter(so => so.statusAtual === 'Em Trânsito').length
      };

      // Generate trend data
      const deliveryTrend = Array.from({
        length: 30
      }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', {
          month: 'short',
          day: 'numeric'
        }),
        deliveries: Math.floor(Math.random() * 20) + 5
      }));

      console.log('✅ Dados carregados do Supabase:', {
        enviosCount: enviosData?.length || 0,
        transformedSOsCount: transformedSOs.length,
        primeiraSO: transformedSOs[0]
      });

      setData({
        overview: {
          activeSOs,
          inTransit,
          expectedArrivals,
          deliveryTrend,
          criticalShipments,
          statusCounts
        },
        sos: transformedSOs,
        cargas: transformedCargas
      });
      
      // Apply delivered filter
      const filtered = showDelivered ? transformedSOs : transformedSOs.filter(so => !so.isDelivered);
      setFilteredSOs(filtered);
      
      console.log('📤 setFilteredSOs chamado com:', filtered.length, 'SOs');
      
      setLastUpdate(new Date());
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
  
  // Update filtered SOs when showDelivered changes
  useEffect(() => {
    const filtered = showDelivered ? data.sos : data.sos.filter(so => !so.isDelivered);
    setFilteredSOs(filtered);
  }, [showDelivered, data.sos]);
  
  useEffect(() => {
    loadDashboardData();

    // Auto-refresh a cada 30 segundos
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Atualizando dados...');
      loadDashboardData();
    }, 30000);

    // Setup Realtime listeners
    const enviosChannel = supabase
      .channel('envios-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'envios_processados'
        },
        (payload) => {
          console.log('📨 Novo evento em envios_processados:', payload);
          toast({
            title: "Dados Atualizados",
            description: "Novos dados recebidos do N8N!",
          });
          loadDashboardData();
        }
      )
      .subscribe();

    const cargasChannel = supabase
      .channel('cargas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cargas'
        },
        (payload) => {
          console.log('📨 Novo evento em cargas:', payload);
          loadDashboardData();
        }
      )
      .subscribe();

    const notifChannel = supabase
      .channel('notif-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_queue'
        },
        (payload) => {
          console.log('🔔 Nova notificação:', payload);
          loadNotificationCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(enviosChannel);
      supabase.removeChannel(cargasChannel);
      supabase.removeChannel(notifChannel);
    };
  }, []);
  const handleSOClick = (so: any) => {
    setSelectedSO(so);
  };
  const loadNotificationCount = async () => {
    try {
      const {
        count,
        error
      } = await supabase.from('notification_queue').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'pendente');
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
  
  // Debug: Log filteredSOs changes
  useEffect(() => {
    console.log('🎯 filteredSOs mudou:', filteredSOs.length, 'SOs');
    if (filteredSOs.length > 0) {
      console.log('📋 Primeira SO:', filteredSOs[0]);
    }
  }, [filteredSOs]);
  
  const handleExportToXLSX = () => {
    try {
      // Prepare data for export
      const exportData = filteredSOs.map(so => ({
        'Sales Order': so.salesOrder,
        'Cliente': so.cliente,
        'Produtos': so.produtos,
        'Valor Total': so.valorTotal || 0,
        'Status Atual': so.statusAtual,
        'Última Localização': so.ultimaLocalizacao,
        'Data Atualização': new Date(so.dataUltimaAtualizacao).toLocaleDateString('pt-BR'),
        'SAP SO': so.erpOrder || '',
        'WO': so.webOrder || '',
        'Tracking Numbers': so.trackingNumbers || ''
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Orders');
      
      // Generate filename with current date
      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const filename = `sintese-tracker-${date}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename} foi baixado com sucesso!`,
      });
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    }
  };

  const handleCargoClick = async (cargo: any) => {
    try {
      console.log(`🔍 Carregando detalhes da carga ${cargo.numero}...`);

      // Load cargo-SO relationships - SEM LIMIT para pegar todas as SOs
      const {
        data: cargoSORelations,
        error: cargoSOError
      } = await supabase.from('carga_sales_orders').select('so_number').eq('numero_carga', cargo.numero);
      if (cargoSOError) throw cargoSOError;
      console.log(`📦 Encontradas ${cargoSORelations?.length || 0} SOs vinculadas à carga ${cargo.numero}`);

      // Get SO numbers for this cargo
      const soNumbers = cargoSORelations?.map(rel => rel.so_number) || [];
      if (soNumbers.length === 0) {
        console.warn(`⚠️ Nenhuma SO encontrada para a carga ${cargo.numero}`);
      }

      // Load SO data - SEM LIMIT para pegar todas as SOs vinculadas
      const {
        data: enviosData,
        error: enviosError
      } = await supabase.from('envios_processados').select('*').in('sales_order', soNumbers);
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
        // Update the count to match actual loaded SOs
        sosVinculadasCount: linkedSOs.length,
        historico: [{
          id: '1',
          evento: 'Carga Embarcada',
          dataEvento: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          detalhes: {},
          fonte: 'Sistema de Controle'
        }, {
          id: '2',
          evento: 'Em Trânsito Internacional',
          dataEvento: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          detalhes: {},
          fonte: 'Rastreamento Internacional'
        }, {
          id: '3',
          evento: 'Chegada Prevista Atualizada',
          dataEvento: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          detalhes: {
            nova_data: cargo.dataChegadaPrevista
          },
          fonte: 'Sistema Automático'
        }]
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
  return <div className="min-h-screen bg-gradient-dark relative">
      <ParticleBackground />
      {/* Modern Tech Header */}
      <div className="border-b border-border/50 bg-gradient-tech/5 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-tech shadow-tech">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-tech text-foreground">Síntese Tracker</h1>
                <p className="text-muted-foreground font-medium">
                  Rastreamento Inteligente de Cargas
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Export Button */}
              <Button
                onClick={handleExportToXLSX}
                variant="ghost"
                size="sm"
                className="gap-2 px-3 py-2 rounded-xl hover:bg-primary/10 transition-all duration-300"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="text-sm">Exportar</span>
              </Button>

              {/* Show Delivered Toggle */}
              <Button
                onClick={() => setShowDelivered(!showDelivered)}
                variant={showDelivered ? "default" : "ghost"}
                size="sm"
                className="gap-2 px-3 py-2 rounded-xl transition-all duration-300"
              >
                <Package className="h-4 w-4" />
                <span className="text-sm">
                  {showDelivered ? "Ocultar Entregues" : `Entregues (${data.sos.filter(so => so.isDelivered).length})`}
                </span>
              </Button>

              {/* Refresh Button */}
              <Button
                onClick={() => {
                  toast({
                    title: "Atualizando...",
                    description: "Buscando novos dados",
                  });
                  loadDashboardData();
                }}
                variant="ghost"
                size="sm"
                className="gap-2 px-3 py-2 rounded-xl hover:bg-primary/10 transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm">Atualizar</span>
              </Button>

              {/* Theme Toggle */}
              <Button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                variant="ghost"
                size="sm"
                className="p-3 rounded-xl hover:bg-primary/10 transition-all duration-300"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              {/* Notification Bell with Glow */}
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setShowNotifications(true)} className="p-3 rounded-xl hover:bg-primary/10 transition-all duration-300 group">
                  <Bell className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                  {unreadNotifications > 0 && <Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-gradient-alert glow-accent animate-glow-pulse">
                      {unreadNotifications}
                    </Badge>}
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
              <Button variant="outline" size="sm" onClick={signOut} className="px-6 py-2 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
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
          <TabsList className="grid w-full max-w-6xl grid-cols-3 mx-auto glass p-1 rounded-2xl">
            <TabsTrigger 
              value="sos"
              style={activeTab === "sos" ? { background: 'var(--gradient-tech)' } : {}}
              className="rounded-xl font-tech data-[state=active]:text-white data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted/50 transition-all duration-300"
            >
              Sales Orders
            </TabsTrigger>
            <TabsTrigger 
              value="charts"
              style={activeTab === "charts" ? { background: 'var(--gradient-tech)' } : {}}
              className="rounded-xl font-tech data-[state=active]:text-white data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted/50 transition-all duration-300"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="reports"
              style={activeTab === "reports" ? { background: 'var(--gradient-tech)' } : {}}
              className="rounded-xl font-tech data-[state=active]:text-white data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted/50 transition-all duration-300"
            >
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sos" className="animate-fade-in">
            <div className="space-y-8">
              <Overview data={data.overview} allSOs={data.sos} />
              <SOTable data={filteredSOs} onSOClick={handleSOClick} isLoading={loading} />
            </div>
          </TabsContent>

          <TabsContent value="charts" className="animate-fade-in">
            <Charts />
          </TabsContent>

          <TabsContent value="reports" className="animate-fade-in">
            <Reports />
          </TabsContent>
        </Tabs>
      </div>

      {/* SO Details Modal */}
      {selectedSO && <SODetails so={selectedSO} onClose={() => setSelectedSO(null)} />}

      {/* Cargo Details Modal */}
      {selectedCargo && <CargoDetails cargo={selectedCargo} onClose={() => setSelectedCargo(null)} />}

      {/* Notification Center */}
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} unreadCount={unreadNotifications} onCountUpdate={setUnreadNotifications} />

      {/* Loading Overlay with Modern Design */}
      {loading && <div className="fixed inset-0 bg-background/80 backdrop-blur-lg z-40 flex items-center justify-center">
          <Card className="glass p-8 border-border/50">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="font-tech text-lg text-foreground">Carregando dados...</span>
            </div>
          </Card>
        </div>}
    </div>;
};
export default LogisticsDashboard;
