interface SO {
  statusAtual: string;
  dataUltimaAtualizacao: string;
  isDelivered: boolean;
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
  const lastUpdate = new Date(so.dataUltimaAtualizacao);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  let expectedDays = 0;
  let stage = '';

  // Define SLA baseado no status
  if (currentStatus.includes('produção') || currentStatus.includes('producao')) {
    expectedDays = 14;
    stage = 'Produção';
  } else if (currentStatus.includes('enviado') || currentStatus.includes('fedex') || currentStatus.includes('saiu')) {
    expectedDays = 1;
    stage = 'Envio';
  } else if (currentStatus.includes('armazém') || currentStatus.includes('armazem')) {
    expectedDays = 5;
    stage = 'Armazém';
  } else if (currentStatus.includes('importação') || currentStatus.includes('importacao')) {
    expectedDays = 10;
    stage = 'Importação';
  } else if (currentStatus.includes('voo') || currentStatus.includes('internacional')) {
    expectedDays = 2;
    stage = 'Voo';
  } else if (currentStatus.includes('desembaraço') || currentStatus.includes('desembaraco')) {
    expectedDays = 6;
    stage = 'Desembaraço';
  } else if (currentStatus.includes('trânsito') || currentStatus.includes('transito')) {
    expectedDays = 5;
    stage = 'Trânsito';
  } else {
    return null;
  }

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
