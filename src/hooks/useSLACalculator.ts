interface SO {
  statusAtual: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  isDelivered: boolean;
  trackingNumbers?: string;
}

interface SLAResult {
  daysRemaining: number;           // Dias restantes para ENTREGA (baseado em deliveryForecastDays)
  urgency: 'ok' | 'warning' | 'critical' | 'overdue';  // Baseado em slaDays
  expectedDays: number;            // SLA interno (5 dias para armazém)
  deliveryForecastDays: number;    // Previsão de entrega ao cliente (12 dias)
  daysSinceUpdate: number;
  stage: string;
}

export const useSLACalculator = (so: SO): SLAResult | null => {
  if (so.isDelivered) return null;

  const currentStatus = so.statusAtual.toLowerCase();
  
  // Enquanto estiver em produção, não há ETA
  if (currentStatus.includes('produção') || currentStatus.includes('producao')) {
    return null;
  }

  // SLA interno - para determinar urgência (alerta visual)
  const slaDaysMap: Record<string, number> = {
    'armazém': 5,
    'armazem': 5,
    'fedex': 12,
    'enviado': 12,
    'em trânsito': 8,
    'em transito': 8,
    'embarque': 10,
    'chegada': 5,
    'brasil': 5,
    'desembaraço': 2,
    'desembaraco': 2,
    'desembaraçado': 2,
    'desembaracado': 2,
    'liberação': 2,
    'liberacao': 2
  };

  // Previsão de entrega ao cliente - 12 dias úteis total
  const deliveryForecastMap: Record<string, number> = {
    'armazém': 10,
    'armazem': 10,
    'fedex': 12,
    'enviado': 12,
    'em trânsito': 6,
    'em transito': 6,
    'embarque': 8,
    'chegada': 4,
    'brasil': 4,
    'desembaraço': 2,
    'desembaraco': 2,
    'desembaraçado': 2,
    'desembaracado': 2,
    'liberação': 2,
    'liberacao': 2
  };

  // Mapeamento de nomes de estágios
  const stageNameMap: Record<string, string> = {
    'armazém': 'No Armazém',
    'armazem': 'No Armazém',
    'fedex': 'FedEx',
    'enviado': 'FedEx',
    'em trânsito': 'Em Trânsito',
    'em transito': 'Em Trânsito',
    'embarque': 'Em Trânsito',
    'chegada': 'Chegada no Brasil',
    'brasil': 'Chegada no Brasil',
    'desembaraço': 'Desembaraço',
    'desembaraco': 'Desembaraço',
    'desembaraçado': 'Desembaraçado',
    'desembaracado': 'Desembaraçado',
    'liberação': 'Desembaraço',
    'liberacao': 'Desembaraço'
  };

  // Encontrar o status correspondente
  let slaDays = 12;           // Default para FedEx (12 dias)
  let forecastDays = 12;      // Default para FedEx (12 dias)
  let stage = 'FedEx';
  
  for (const key of Object.keys(slaDaysMap)) {
    if (currentStatus.includes(key)) {
      slaDays = slaDaysMap[key];
      forecastDays = deliveryForecastMap[key];
      stage = stageNameMap[key];
      break;
    }
  }

  // Usa data_ordem quando disponível, caso contrário usa dataUltimaAtualizacao
  const referenceDate = new Date(so.dataOrdem || so.dataUltimaAtualizacao);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  // Urgência baseada no SLA interno
  const slaRemaining = slaDays - daysSinceUpdate;
  let urgency: 'ok' | 'warning' | 'critical' | 'overdue';
  if (slaRemaining < 0) {
    urgency = 'overdue';
  } else if (slaRemaining <= 1) {
    urgency = 'critical';
  } else if (slaRemaining <= 3) {
    urgency = 'warning';
  } else {
    urgency = 'ok';
  }

  // ETA baseada na previsão de entrega ao cliente
  const daysRemaining = forecastDays - daysSinceUpdate;

  return {
    daysRemaining,                    // Dias para ENTREGA
    urgency,                          // Urgência baseada no SLA interno
    expectedDays: slaDays,            // SLA interno
    deliveryForecastDays: forecastDays, // Previsão ao cliente
    daysSinceUpdate,
    stage
  };
};
