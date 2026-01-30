import { differenceInBusinessDays } from 'date-fns';

interface SO {
  statusAtual: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  dataArmazem?: string;
  dataEnvio?: string;  // Data de envio FedEx (saída da fábrica)
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
  // Prazo total: 15 dias ÚTEIS a partir do ENVIO FedEx (data_envio)
  const slaDaysMap: Record<string, number> = {
    'armazém': 15,
    'armazem': 15,
    'fedex': 12,
    'embarque agendado': 10,
    'embarque confirmado': 7,
    'chegada': 5,
    'brasil': 5,
    'em desembaraço': 2,
    'desembaraço': 2,
    'desembaraco': 2
  };

  // Previsão de entrega ao cliente - para informar ETA
  // Prazo total: 15 dias ÚTEIS a partir do ENVIO FedEx (data_envio)
  const deliveryForecastMap: Record<string, number> = {
    'armazém': 15,
    'armazem': 15,
    'fedex': 12,
    'embarque agendado': 10,
    'embarque confirmado': 7,
    'chegada': 5,
    'brasil': 5,
    'em desembaraço': 2,
    'desembaraço': 2,
    'desembaraco': 2
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
    'em desembaraço': 'Em Desembaraço',
    'desembaraço': 'Em Desembaraço',
    'desembaraco': 'Em Desembaraço'
  };

  // Encontrar o status correspondente
  let slaDays = 15;           // Default: 15 dias ÚTEIS a partir do envio FedEx
  let forecastDays = 15;      // Default: 15 dias ÚTEIS a partir do envio FedEx
  let stage = 'FedEx';
  
  for (const key of Object.keys(slaDaysMap)) {
    if (currentStatus.includes(key)) {
      slaDays = slaDaysMap[key];
      forecastDays = deliveryForecastMap[key];
      stage = stageNameMap[key];
      break;
    }
  }

  // CRÍTICO: Usa data_envio (envio FedEx) como início do SLA
  // Se data_envio não existir, não é possível calcular SLA confiável
  if (!so.dataEnvio) {
    return null;  // Sem data de envio, não há como calcular SLA
  }

  const referenceDate = new Date(so.dataEnvio);
  const now = new Date();

  // Calcula dias ÚTEIS decorridos desde o envio FedEx
  const daysSinceUpdate = differenceInBusinessDays(now, referenceDate);

  // Urgência baseada no SLA interno (15 dias úteis)
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
