import { useMemo } from 'react';

interface SO {
  statusAtual: string;
  dataUltimaAtualizacao: string;
  isDelivered: boolean;
}

interface AlertLevel {
  level: number;
  message: string;
  color: 'destructive' | 'warning' | 'default';
  stage: string;
  daysOverdue: number;
}

export const useAlertLevel = (so: SO): AlertLevel | null => {
  return useMemo(() => {
    // Não mostrar alerta se já foi entregue
    if (so.isDelivered) return null;
    
    const currentStatus = so.statusAtual.toLowerCase();
    
    // Não mostrar alerta se ainda está em produção
    if (currentStatus.includes('produção') || currentStatus.includes('producao')) {
      return null;
    }
    
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular atraso baseado no status atual e prazos esperados
    let expectedDays = 0;
    let stage = '';
    
    if (currentStatus.includes('enviado') || currentStatus.includes('fedex') || currentStatus.includes('saiu')) {
      expectedDays = 1; // Deveria chegar no armazém em 1 dia
      stage = 'chegada no armazém';
    } else if (currentStatus.includes('armazém') || currentStatus.includes('armazem')) {
      expectedDays = 5; // Deveria estar em voo em 5 dias
      stage = 'voo internacional';
    } else if (currentStatus.includes('voo') || currentStatus.includes('internacional')) {
      expectedDays = 2; // Deveria estar em desembaraço em 2 dias
      stage = 'desembaraço';
    } else if (currentStatus.includes('desembaraço') || currentStatus.includes('desembaraco')) {
      expectedDays = 6; // Deveria ser entregue em 6 dias (1 + 5)
      stage = 'entrega';
    } else if (currentStatus.includes('importação') || currentStatus.includes('importacao')) {
      expectedDays = 3; // Processo de importação deveria levar 3 dias
      stage = 'processo de importação';
    }
    
    if (expectedDays === 0) return null;
    
    const daysOverdue = Math.floor(daysSinceUpdate - expectedDays);
    
    if (daysOverdue > 5) {
      return { 
        level: 3, 
        message: `${daysOverdue} dias de atraso em ${stage}`, 
        color: 'destructive',
        stage,
        daysOverdue
      };
    } else if (daysOverdue > 2) {
      return { 
        level: 2, 
        message: `${daysOverdue} dias de atraso em ${stage}`, 
        color: 'warning',
        stage,
        daysOverdue
      };
    } else if (daysOverdue > 0) {
      return { 
        level: 1, 
        message: `${daysOverdue} dia(s) de atraso em ${stage}`, 
        color: 'default',
        stage,
        daysOverdue
      };
    }
    
    return null;
  }, [so.statusAtual, so.dataUltimaAtualizacao, so.isDelivered]);
};

export const getCriticalSummary = (sos: SO[]) => {
  const criticalSOs = sos.filter(so => {
    if (so.isDelivered) return false;
    const currentStatus = so.statusAtual.toLowerCase();
    if (currentStatus.includes('produção') || currentStatus.includes('producao')) return false;
    
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    let expectedDays = 0;
    if (currentStatus.includes('enviado') || currentStatus.includes('fedex') || currentStatus.includes('saiu')) {
      expectedDays = 1;
    } else if (currentStatus.includes('armazém') || currentStatus.includes('armazem')) {
      expectedDays = 5;
    } else if (currentStatus.includes('voo') || currentStatus.includes('internacional')) {
      expectedDays = 2;
    } else if (currentStatus.includes('desembaraço') || currentStatus.includes('desembaraco')) {
      expectedDays = 6;
    } else if (currentStatus.includes('importação') || currentStatus.includes('importacao')) {
      expectedDays = 3;
    }
    
    const daysOverdue = daysSinceUpdate - expectedDays;
    return daysOverdue > 2; // Crítico se > 2 dias de atraso
  });
  
  // Agrupar por problema
  const summary = {
    total: criticalSOs.length,
    byStage: {} as Record<string, number>,
    byLevel: {
      critical: 0,
      warning: 0,
      attention: 0
    }
  };
  
  criticalSOs.forEach(so => {
    const currentStatus = so.statusAtual.toLowerCase();
    const lastUpdate = new Date(so.dataUltimaAtualizacao);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    let stage = '';
    let expectedDays = 0;
    
    if (currentStatus.includes('enviado') || currentStatus.includes('fedex') || currentStatus.includes('saiu')) {
      stage = 'chegada no armazém';
      expectedDays = 1;
    } else if (currentStatus.includes('armazém') || currentStatus.includes('armazem')) {
      stage = 'voo internacional';
      expectedDays = 5;
    } else if (currentStatus.includes('voo') || currentStatus.includes('internacional')) {
      stage = 'desembaraço';
      expectedDays = 2;
    } else if (currentStatus.includes('desembaraço') || currentStatus.includes('desembaraco')) {
      stage = 'entrega';
      expectedDays = 6;
    } else if (currentStatus.includes('importação') || currentStatus.includes('importacao')) {
      stage = 'processo de importação';
      expectedDays = 3;
    }
    
    const daysOverdue = daysSinceUpdate - expectedDays;
    
    if (stage) {
      summary.byStage[stage] = (summary.byStage[stage] || 0) + 1;
    }
    
    if (daysOverdue > 5) {
      summary.byLevel.critical++;
    } else if (daysOverdue > 2) {
      summary.byLevel.warning++;
    } else {
      summary.byLevel.attention++;
    }
  });
  
  return summary;
};
