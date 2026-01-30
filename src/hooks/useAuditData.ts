import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateBusinessDays, DELIVERY_SLA_BUSINESS_DAYS, normalizeStatus } from '@/lib/statusNormalizer';

export interface AuditSORecord {
  salesOrder: string;
  cliente: string;
  valorTotal: number;
  isDelivered: boolean;
  dataEnvio: string | null;
  dataEntrega: string | null;
  statusAtual: string;
  businessDays: number | null;
  onTime: boolean | null;
  missingFields: string[];
}

export interface AuditIndicator {
  name: string;
  value: string;
  formula: string;
  sampleSize: number;
  totalEligible: number;
  coveragePercent: number;
  records: AuditSORecord[];
  missingDataRecords: AuditSORecord[];
}

export interface AuditData {
  indicators: AuditIndicator[];
  summary: {
    totalSOs: number;
    totalDelivered: number;
    withDataEnvio: number;
    withDataEntrega: number;
    withBothDates: number;
    coveragePercent: number;
  };
  loading: boolean;
}

export const useAuditData = () => {
  const [data, setData] = useState<AuditData>({
    indicators: [],
    summary: { totalSOs: 0, totalDelivered: 0, withDataEnvio: 0, withDataEntrega: 0, withBothDates: 0, coveragePercent: 0 },
    loading: true
  });

  const loadAuditData = async () => {
    try {
      // Fetch all SOs
      const { data: enviosData, error } = await supabase
        .from('envios_processados')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch delivery dates from cargas.data_entrega via carga_sales_orders
      const deliveryDatesMap: Record<string, string> = {};
      const { data: cargoSOLinks } = await supabase
        .from('carga_sales_orders')
        .select('so_number, numero_carga');

      if (cargoSOLinks && cargoSOLinks.length > 0) {
        const cargoNumbers = [...new Set(cargoSOLinks.map(l => l.numero_carga))];
        const { data: cargasData } = await supabase
          .from('cargas')
          .select('numero_carga, data_entrega')
          .in('numero_carga', cargoNumbers)
          .not('data_entrega', 'is', null);

        const cargoDeliveryMap: Record<string, string> = {};
        cargasData?.forEach(c => {
          if (c.data_entrega) cargoDeliveryMap[c.numero_carga] = c.data_entrega;
        });
        cargoSOLinks.forEach(link => {
          const dd = cargoDeliveryMap[link.numero_carga];
          if (dd) deliveryDatesMap[link.so_number] = dd;
        });
      }

      // Build audit records
      const allRecords: AuditSORecord[] = (enviosData || []).map(e => {
        const dataEntrega = deliveryDatesMap[e.sales_order] || null;
        const missing: string[] = [];
        if (!e.data_envio) missing.push('data_envio');
        if (!dataEntrega && e.is_delivered) missing.push('data_entrega');

        let businessDays: number | null = null;
        let onTime: boolean | null = null;

        if (e.data_envio && dataEntrega) {
          businessDays = calculateBusinessDays(new Date(e.data_envio), new Date(dataEntrega));
          onTime = businessDays <= DELIVERY_SLA_BUSINESS_DAYS;
        }

        return {
          salesOrder: e.sales_order,
          cliente: e.cliente,
          valorTotal: Number(e.valor_total) || 0,
          isDelivered: !!e.is_delivered,
          dataEnvio: e.data_envio || null,
          dataEntrega,
          statusAtual: normalizeStatus(e.status_atual),
          businessDays,
          onTime,
          missingFields: missing
        };
      });

      const delivered = allRecords.filter(r => r.isDelivered);
      const withBothDates = delivered.filter(r => r.dataEnvio && r.dataEntrega);
      const withDataEnvio = allRecords.filter(r => r.dataEnvio).length;
      const withDataEntrega = allRecords.filter(r => r.dataEntrega).length;

      // Indicator 1: Taxa de Entrega no Prazo
      const onTimeRecords = withBothDates.filter(r => r.onTime === true);
      const lateRecords = withBothDates.filter(r => r.onTime === false);
      const onTimeRate = withBothDates.length > 0
        ? Math.round((onTimeRecords.length / withBothDates.length) * 100)
        : 0;

      const taxaIndicator: AuditIndicator = {
        name: 'Taxa de Entrega no Prazo',
        value: `${onTimeRate}%`,
        formula: `Pedidos entregues em ≤ ${DELIVERY_SLA_BUSINESS_DAYS} dias úteis (data_envio → cargas.data_entrega) / Total com ambas datas`,
        sampleSize: withBothDates.length,
        totalEligible: delivered.length,
        coveragePercent: delivered.length > 0 ? Math.round((withBothDates.length / delivered.length) * 100) : 0,
        records: withBothDates,
        missingDataRecords: delivered.filter(r => !r.dataEnvio || !r.dataEntrega)
      };

      // Indicator 2: Tempo Médio de Entrega
      const totalBizDays = withBothDates.reduce((sum, r) => sum + (r.businessDays || 0), 0);
      const avgDays = withBothDates.length > 0 ? Math.round(totalBizDays / withBothDates.length) : 0;

      const tempoIndicator: AuditIndicator = {
        name: 'Tempo Médio de Entrega',
        value: `${avgDays} dias úteis`,
        formula: 'Média de dias úteis entre data_envio e cargas.data_entrega para pedidos entregues',
        sampleSize: withBothDates.length,
        totalEligible: delivered.length,
        coveragePercent: delivered.length > 0 ? Math.round((withBothDates.length / delivered.length) * 100) : 0,
        records: withBothDates,
        missingDataRecords: delivered.filter(r => !r.dataEnvio || !r.dataEntrega)
      };

      // Indicator 3: Receita Total
      const receitaTotal = allRecords.reduce((sum, r) => sum + r.valorTotal, 0);
      const withValor = allRecords.filter(r => r.valorTotal > 0);

      const receitaIndicator: AuditIndicator = {
        name: 'Receita Total',
        value: `R$ ${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        formula: 'Soma de valor_total de todos os pedidos (envios_processados)',
        sampleSize: withValor.length,
        totalEligible: allRecords.length,
        coveragePercent: allRecords.length > 0 ? Math.round((withValor.length / allRecords.length) * 100) : 0,
        records: withValor,
        missingDataRecords: allRecords.filter(r => r.valorTotal === 0)
      };

      // Indicator 4: Pedidos Atrasados
      const overdue = allRecords.filter(r => {
        if (r.isDelivered) return false;
        if (!r.dataEnvio) return false;
        const bizDays = calculateBusinessDays(new Date(r.dataEnvio), new Date());
        return bizDays > DELIVERY_SLA_BUSINESS_DAYS;
      });

      const atrasadosIndicator: AuditIndicator = {
        name: 'Pedidos Atrasados',
        value: `${overdue.length}`,
        formula: `Pedidos não entregues com > ${DELIVERY_SLA_BUSINESS_DAYS} dias úteis desde data_envio`,
        sampleSize: allRecords.filter(r => !r.isDelivered && r.dataEnvio).length,
        totalEligible: allRecords.filter(r => !r.isDelivered).length,
        coveragePercent: 100,
        records: overdue,
        missingDataRecords: allRecords.filter(r => !r.isDelivered && !r.dataEnvio)
      };

      setData({
        indicators: [taxaIndicator, tempoIndicator, receitaIndicator, atrasadosIndicator],
        summary: {
          totalSOs: allRecords.length,
          totalDelivered: delivered.length,
          withDataEnvio,
          withDataEntrega,
          withBothDates: withBothDates.length,
          coveragePercent: delivered.length > 0 ? Math.round((withBothDates.length / delivered.length) * 100) : 0
        },
        loading: false
      });
    } catch (error) {
      console.error('Error loading audit data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  return { ...data, refresh: loadAuditData };
};
