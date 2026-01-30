import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSLACalculator } from '@/hooks/useSLACalculator';

export interface DashboardOverview {
  activeSOs: number;
  inTransit: number;
  expectedArrivals: number;
  deliveryTrend: Array<{ date: string; deliveries: number }>;
  criticalShipments: number;
  statusCounts?: {
    emProducao: number;
    emImportacao: number;
    atrasadas: number;
  };
}

export interface DashboardSO {
  id: string;
  salesOrder: string;
  cliente: string;
  produtos: string;
  valorTotal?: number;
  statusAtual: string;
  statusOriginal?: string;
  cargoNumber?: string | null;
  ultimaLocalizacao: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  dataEnvio?: string;
  createdAt?: string;
  erpOrder?: string;
  webOrder?: string;
  trackingNumbers?: string;
  isDelivered: boolean;
}

export interface DashboardCarga {
  id: string;
  numero_carga: string;
  tipo_temperatura: string;
  status: string;
  data_chegada_prevista?: string;
  origem?: string;
  destino?: string;
  transportadora?: string;
  mawb?: string;
  hawb?: string;
  so_count?: number;
  [key: string]: any;
}

export interface DashboardData {
  overview: DashboardOverview;
  sos: DashboardSO[];
  cargas: DashboardCarga[];
}

const INITIAL_DATA: DashboardData = {
  overview: {
    activeSOs: 0,
    inTransit: 0,
    expectedArrivals: 0,
    deliveryTrend: [],
    criticalShipments: 0,
    statusCounts: { emProducao: 0, emImportacao: 0, atrasadas: 0 },
  },
  sos: [],
  cargas: [],
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [showDelivered, setShowDelivered] = useState(false);
  const [showDeliveredCargas, setShowDeliveredCargas] = useState(false);
  const [filteredSOs, setFilteredSOs] = useState<DashboardSO[]>([]);
  const [filteredCargas, setFilteredCargas] = useState<DashboardCarga[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { toast } = useToast();

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const { data: enviosData, error: enviosError } = await supabase
        .from('envios_processados')
        .select('*')
        .order('created_at', { ascending: false });
      if (enviosError) throw enviosError;

      const { data: cargasData, error: cargasError } = await supabase
        .from('cargas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (cargasError) throw cargasError;

      // Count SOs for each carga
      const cargasWithCount = await Promise.all(
        (cargasData || []).map(async (carga) => {
          const { count } = await supabase
            .from('carga_sales_orders')
            .select('*', { count: 'exact', head: true })
            .eq('numero_carga', carga.numero_carga);
          return { ...carga, so_count: count || 0 };
        })
      );

      // Load cargo-SO relationships
      const { data: cargoSOsData, error: cargoSOsError } = await supabase
        .from('carga_sales_orders')
        .select('numero_carga, so_number');
      if (cargoSOsError) throw cargoSOsError;

      const soToCargo: Record<string, string> = {};
      cargoSOsData?.forEach((link) => {
        soToCargo[link.so_number] = link.numero_carga;
      });

      const cargoNumbers = Array.from(
        new Set(cargoSOsData?.map((link) => link.numero_carga) || [])
      );
      const { data: cargosStatusData, error: cargosStatusError } = await supabase
        .from('cargas')
        .select('numero_carga, status')
        .in('numero_carga', cargoNumbers);
      if (cargosStatusError) throw cargosStatusError;

      const cargoStatusMap: Record<string, string> = {};
      cargosStatusData?.forEach((c) => {
        cargoStatusMap[c.numero_carga] = c.status;
      });

      // Transform envios to SO format
      const transformedSOs: DashboardSO[] =
        enviosData?.map((envio) => {
          const cargoNum = soToCargo[envio.sales_order];
          const cargoStatus = cargoNum ? cargoStatusMap[cargoNum] : null;

          return {
            id: envio.id.toString(),
            salesOrder: envio.sales_order,
            cliente: envio.cliente,
            produtos:
              typeof envio.produtos === 'string'
                ? envio.produtos
                : JSON.stringify(envio.produtos || ''),
            valorTotal: envio.valor_total,
            statusAtual:
              cargoStatus ||
              (envio.status_atual === 'Enviado' ? 'Em Importação' : envio.status_atual),
            statusOriginal: envio.status_atual,
            cargoNumber: cargoNum || null,
            ultimaLocalizacao: envio.ultima_localizacao || '',
            dataUltimaAtualizacao: envio.data_ultima_atualizacao || envio.updated_at,
            dataOrdem: envio.data_ordem,
            dataEnvio: envio.data_envio,
            createdAt: envio.created_at,
            erpOrder: envio.erp_order,
            webOrder: envio.web_order,
            trackingNumbers: Array.isArray(envio.tracking_numbers)
              ? envio.tracking_numbers.join(', ')
              : envio.tracking_numbers || '',
            isDelivered:
              (cargoStatus && cargoStatus.toLowerCase() === 'entregue') ||
              envio.status_atual === 'Entregue',
          };
        }) || [];

      const transformedCargas: DashboardCarga[] = cargasWithCount;

      // Calculate overview metrics
      const activeSOs = transformedSOs.filter((so) => !so.isDelivered).length;
      const inTransit = transformedSOs.filter(
        (so) => so.statusAtual === 'Em Trânsito'
      ).length;

      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const expectedArrivals = transformedCargas.filter((carga) => {
        if (carga.status?.toLowerCase() === 'entregue') return false;
        if (!carga.data_chegada_prevista) return false;
        const chegadaPrevista = new Date(carga.data_chegada_prevista);
        return chegadaPrevista >= now && chegadaPrevista <= sevenDaysFromNow;
      }).length;

      const criticalShipments = transformedSOs.filter(
        (so) => !so.isDelivered && so.ultimaLocalizacao
      ).length;

      const atrasadas = transformedSOs.filter((so) => {
        if (so.isDelivered) return false;
        const sla = useSLACalculator(so);
        return sla?.urgency === 'overdue';
      }).length;

      const statusCounts = {
        emProducao: transformedSOs.filter(
          (so) => !so.isDelivered && so.statusAtual === 'Em Produção'
        ).length,
        emImportacao: transformedSOs.filter((so) => {
          if (so.isDelivered) return false;
          const status = so.statusAtual?.toLowerCase() || '';
          const isProduction =
            status.includes('produção') || status.includes('producao');
          return !isProduction;
        }).length,
        atrasadas,
      };

      const deliveryTrend: Array<{ date: string; deliveries: number }> = [];

      const newData: DashboardData = {
        overview: {
          activeSOs,
          inTransit,
          expectedArrivals,
          deliveryTrend,
          criticalShipments,
          statusCounts,
        },
        sos: transformedSOs,
        cargas: transformedCargas,
      };

      setData(newData);
      setFilteredSOs(
        showDelivered
          ? transformedSOs
          : transformedSOs.filter((so) => !so.isDelivered)
      );
      setFilteredCargas(
        showDeliveredCargas
          ? transformedCargas
          : transformedCargas.filter(
              (carga) => carga.status?.toLowerCase() !== 'entregue'
            )
      );
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update filtered SOs when showDelivered changes
  useEffect(() => {
    const filtered = showDelivered
      ? data.sos
      : data.sos.filter((so) => !so.isDelivered);
    setFilteredSOs(filtered);
  }, [showDelivered, data.sos]);

  // Update filtered Cargas when showDeliveredCargas changes
  useEffect(() => {
    const filtered = showDeliveredCargas
      ? data.cargas
      : data.cargas.filter(
          (carga) => carga.status?.toLowerCase() !== 'entregue'
        );
    setFilteredCargas(filtered);
  }, [showDeliveredCargas, data.cargas]);

  // Initial load + realtime subscriptions
  useEffect(() => {
    loadDashboardData();

    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 30 * 60 * 1000);

    const enviosChannel = supabase
      .channel('envios-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'envios_processados' },
        () => {
          toast({
            title: 'Dados Atualizados',
            description: 'Novos dados recebidos do N8N!',
          });
          loadDashboardData();
        }
      )
      .subscribe();

    const cargasChannel = supabase
      .channel('cargas-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cargas' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    const notifChannel = supabase
      .channel('notif-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notification_queue' },
        (payload) => {
          const notif = payload.new as any;
          toast({
            title: notif.titulo || 'Nova notificação',
            description: notif.mensagem || 'Você tem uma nova notificação',
            variant: notif.prioridade === 'alta' ? 'destructive' : 'default',
          });
          setUnreadNotifications((prev) => prev + 1);
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

  useEffect(() => {
    loadNotificationCount();
  }, []);

  return {
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
  };
}
