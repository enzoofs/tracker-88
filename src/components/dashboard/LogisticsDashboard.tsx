import { FC, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, Upload, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDashboardData } from '@/hooks/useDashboardData';
import Overview from './Overview';
import DashboardHeader from './DashboardHeader';
import SOTable from './SOTable';
import CargoDetails from './CargoDetails';
import NotificationCenter from './NotificationCenter';
import SODetails from './SODetails';
import Charts from './Charts';
import Reports from './Reports';
import CargoCard from './CargoCard';
import BulkCargoUpload from './BulkCargoUpload';

const LogisticsDashboard: FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const {
    data,
    loading,
    lastUpdate,
    filteredSOs,
    filteredCargas,
    showDelivered,
    setShowDelivered,
    showDeliveredCargas,
    setShowDeliveredCargas,
    unreadNotifications,
    setUnreadNotifications,
    loadDashboardData,
  } = useDashboardData();

  const [selectedCargo, setSelectedCargo] = useState<any>(null);
  const [selectedSO, setSelectedSO] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState('sos');
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const handleSOClick = (so: any) => {
    setSelectedSO(so);
  };

  const handleExportToXLSX = () => {
    try {
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

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Orders');

      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const filename = `sintese-tracker-${date}.xlsx`;
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
      const { data: cargoSORelations, error: cargoSOError } = await supabase
        .from('carga_sales_orders')
        .select('so_number')
        .eq('numero_carga', cargo.numero);
      if (cargoSOError) throw cargoSOError;

      const soNumbers = cargoSORelations?.map(rel => rel.so_number) || [];

      const { data: enviosData, error: enviosError } = await supabase
        .from('envios_processados')
        .select('*')
        .in('sales_order', soNumbers);
      if (enviosError) throw enviosError;

      const linkedSOs = enviosData?.map(envio => ({
        id: envio.id.toString(),
        salesOrder: envio.sales_order,
        cliente: envio.cliente,
        produtos: envio.produtos || '',
        statusAtual: envio.status_atual,
        trackingNumbers: envio.tracking_numbers,
        prioridade: 'normal' as 'high' | 'normal' | 'low'
      })) || [];

      const cargoDetails = {
        ...cargo,
        sosVinculadas: linkedSOs,
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
          detalhes: { nova_data: cargo.dataChegadaPrevista },
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

  const handleRefresh = async () => {
    toast({
      title: "Atualizando...",
      description: "Buscando novos dados",
    });
    await loadDashboardData();
    toast({
      title: "Atualizado",
      description: `${data.sos.length} SOs e ${data.cargas.length} cargas carregados`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark relative">
      <DashboardHeader
        lastUpdate={lastUpdate}
        loading={loading}
        userName={user?.email?.split('@')[0] || 'Usuário'}
        unreadNotifications={unreadNotifications}
        onRefresh={handleRefresh}
        onExport={handleExportToXLSX}
        onNotificationsOpen={() => setShowNotifications(true)}
        onSignOut={signOut}
      />

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-6xl grid-cols-4 mx-auto glass p-1 rounded-2xl">
            <TabsTrigger value="sos" className="rounded-xl font-tech">
              Sales Orders
            </TabsTrigger>
            <TabsTrigger value="cargas" className="rounded-xl font-tech">
              Cargas
            </TabsTrigger>
            <TabsTrigger value="charts" className="rounded-xl font-tech">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl font-tech">
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sos" className="animate-fade-in">
            <div className="space-y-8">
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowDelivered(!showDelivered)}
                  variant={showDelivered ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  {showDelivered ? "Ocultar Entregues" : `Mostrar Entregues (${data.sos.filter(so => so.isDelivered).length})`}
                </Button>
              </div>
              <Overview data={data.overview} allSOs={data.sos} />
              <SOTable data={filteredSOs} onSOClick={handleSOClick} isLoading={loading} />
            </div>
          </TabsContent>

          <TabsContent value="cargas" className="animate-fade-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Cargas Consolidadas</h2>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowDeliveredCargas(!showDeliveredCargas)}
                    variant={showDeliveredCargas ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    {showDeliveredCargas ? "Ocultar Entregues" : `Mostrar Entregues (${data.cargas.filter(c => c.status?.toLowerCase() === 'entregue').length})`}
                  </Button>
                  <Button
                    onClick={() => setShowBulkUpload(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Planilha
                  </Button>
                  <Badge className="bg-primary/10 text-primary">
                    {filteredCargas.length} cargas ativas
                  </Badge>
                </div>
              </div>

              {(() => {
                const cargasComDadosFaltantes = filteredCargas.filter(carga => {
                  const isNotInConsolidation = !carga.status?.toLowerCase().includes('consolidação');
                  if (!isNotInConsolidation) return false;
                  const missingArmazem = !carga.data_armazem;
                  const missingEmbarque = !carga.data_embarque;
                  const missingEntrega = carga.status?.toLowerCase() === 'entregue' && !carga.data_entrega;
                  return missingArmazem || missingEmbarque || missingEntrega;
                });

                if (cargasComDadosFaltantes.length > 0) {
                  return (
                    <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-amber-600">
                            {cargasComDadosFaltantes.length} carga(s) com dados incompletos
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            As seguintes cargas têm campos de data faltantes que podem afetar o cálculo de SLA:
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {cargasComDadosFaltantes.slice(0, 10).map(carga => (
                              <Badge
                                key={carga.id}
                                variant="outline"
                                className="cursor-pointer border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                onClick={() => handleCargoClick(carga)}
                              >
                                {carga.numero_carga}
                              </Badge>
                            ))}
                            {cargasComDadosFaltantes.length > 10 && (
                              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                                +{cargasComDadosFaltantes.length - 10} mais
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                }
                return null;
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCargas.map((carga) => (
                  <CargoCard
                    key={carga.id}
                    carga={carga}
                    onClick={() => handleCargoClick(carga)}
                  />
                ))}
              </div>
              {filteredCargas.length === 0 && (
                <Card className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma carga encontrada</p>
                </Card>
              )}
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

      {selectedSO && <SODetails so={selectedSO} onClose={() => setSelectedSO(null)} />}
      {selectedCargo && <CargoDetails cargo={selectedCargo} onClose={() => setSelectedCargo(null)} />}
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} unreadCount={unreadNotifications} onCountUpdate={setUnreadNotifications} />
      <BulkCargoUpload isOpen={showBulkUpload} onClose={() => setShowBulkUpload(false)} onSuccess={loadDashboardData} />

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
