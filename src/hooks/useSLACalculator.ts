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

  // Usa data_ordem quando disponível, caso contrário usa dataUltimaAtualizacao
  const referenceDate = new Date(so.dataOrdem || so.dataUltimaAtualizacao);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  // Após receber tracking numbers (envio do fornecedor), temos 15 dias úteis para entrega
  const expectedDays = 15;
  const stage = 'Entrega';

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
