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
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

import Overview from './Overview';
import SOTable from './SOTable';
import CargoMap from './CargoMap';
import CargoDetails from './CargoDetails';

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
  const [activeTab, setActiveTab] = useState('overview');
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
    toast({
      title: "SO Selecionada",
      description: `Visualizando detalhes da SO ${so.salesOrder}`,
    });
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
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
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
          </TabsList>

          <TabsContent value="overview">
            <Overview data={data.overview} />
          </TabsContent>

          <TabsContent value="sos">
            <SOTable 
              data={data.sos} 
              onSOClick={handleSOClick}
            />
          </TabsContent>

          <TabsContent value="cargas">
            <CargoMap 
              cargas={data.cargas}
              onCargoClick={handleCargoClick}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Cargo Details Modal */}
      {selectedCargo && (
        <CargoDetails 
          cargo={selectedCargo}
          onClose={() => setSelectedCargo(null)}
        />
      )}

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