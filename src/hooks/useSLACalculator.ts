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
  deliveryForecastDays: number;    // Previsão de entrega ao cliente (14 dias para armazém)
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
  // Prazo total: 15 dias corridos a partir da saída da fábrica
  const slaDaysMap: Record<string, number> = {
    'armazém': 8,
    'armazem': 8,
    'fedex': 15,
    'embarque agendado': 10,
    'embarque confirmado': 7,
    'chegada': 5,
    'brasil': 5,
    'desembaraço': 2,
    'desembaraco': 2,
    'desembaraçado': 2,
    'desembaracado': 2
  };

  // Previsão de entrega ao cliente - para informar ETA
  // Prazo total: 15 dias corridos a partir da saída da fábrica
  const deliveryForecastMap: Record<string, number> = {
    'armazém': 13,
    'armazem': 13,
    'fedex': 15,
    'embarque agendado': 10,
    'embarque confirmado': 7,
    'chegada': 5,
    'brasil': 5,
    'desembaraço': 2,
    'desembaraco': 2,
    'desembaraçado': 2,
    'desembaracado': 2
  };

  // Mapeamento de nomes de estágios
  const stageNameMap: Record<string, string> = {
    'armazém': 'No Armazém',
    'armazem': 'No Armazém',
    'fedex': 'FedEx',
    'embarque agendado': 'Embarque Agendado',
    'embarque confirmado': 'Embarque Confirmado',
    'chegada': 'Chegada no Brasil',
    'brasil': 'Chegada no Brasil',
    'desembaraço': 'Desembaraço',
    'desembaraco': 'Desembaraço',
    'desembaraçado': 'Desembaraçado',
    'desembaracado': 'Desembaraçado'
  };

  // Encontrar o status correspondente
  let slaDays = 15;           // Default: 15 dias corridos a partir da saída da fábrica
  let forecastDays = 15;      // Default: 15 dias corridos a partir da saída da fábrica
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

  // Urgência baseada no SLA interno (5 dias para armazém)
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

  // ETA baseada na previsão de entrega ao cliente (14 dias para armazém)
  const daysRemaining = forecastDays - daysSinceUpdate;

  return {
    daysRemaining,                    // Dias para ENTREGA (14 - decorridos para armazém)
    urgency,                          // Urgência baseada no SLA interno (5 dias)
    expectedDays: slaDays,            // SLA interno
    deliveryForecastDays: forecastDays, // Previsão ao cliente
    daysSinceUpdate,
    stage
  };
};
