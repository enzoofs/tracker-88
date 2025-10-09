interface SO {
  statusAtual: string;
  dataUltimaAtualizacao: string;
  dataOrdem?: string;
  isDelivered: boolean;
  trackingNumbers?: string;
}

interface SLAResult {
  daysRemaining: number;
  urgency: 'ok' | 'warning' | 'critical' | 'overdue';
  expectedDays: number;
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

  // Mapeamento de status → dias úteis restantes
  const statusDaysMap: Record<string, { days: number; stage: string }> = {
    'armazém': { days: 14, stage: 'No Armazém' },
    'armazem': { days: 14, stage: 'No Armazém' },
    'fedex': { days: 15, stage: 'FedEx' },
    'embarque agendado': { days: 11, stage: 'Embarque Agendado' },
    'embarque confirmado': { days: 9, stage: 'Embarque Confirmado' },
    'chegada': { days: 5, stage: 'Chegada no Brasil' },
    'brasil': { days: 5, stage: 'Chegada no Brasil' },
    'desembaraçado': { days: 2, stage: 'Desembaraçado' },
    'desembaracado': { days: 2, stage: 'Desembaraçado' }
  };

  // Encontrar o status correspondente
  let expectedDays = 15; // Default para FedEx
  let stage = 'FedEx';
  
  for (const [key, value] of Object.entries(statusDaysMap)) {
    if (currentStatus.includes(key)) {
      expectedDays = value.days;
      stage = value.stage;
      break;
    }
  }

  // Usa data_ordem quando disponível, caso contrário usa dataUltimaAtualizacao
  const referenceDate = new Date(so.dataOrdem || so.dataUltimaAtualizacao);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  const daysRemaining = expectedDays - daysSinceUpdate;
  
  let urgency: 'ok' | 'warning' | 'critical' | 'overdue';
  if (daysRemaining < 0) {
    urgency = 'overdue';
  } else if (daysRemaining <= 1) {
    urgency = 'critical';
  } else if (daysRemaining <= 3) {
    urgency = 'warning';
  } else {
    urgency = 'ok';
  }

  return {
    daysRemaining,
    urgency,
    expectedDays,
    daysSinceUpdate,
    stage
  };
};
