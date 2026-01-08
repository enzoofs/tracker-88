// Normalizador de status para garantir consistência no sistema

// Mapeamento de status não-padrão para status do sistema
const STATUS_NORMALIZATION_MAP: Record<string, string> = {
  // FedEx status variations
  'Saiu da Localização FedEx': 'Em Trânsito',
  'Departed FedEx location': 'Em Trânsito',
  'At FedEx destination facility': 'Em Trânsito',
  'Na Instalação FedEx de Destino': 'Em Trânsito',
  'On FedEx vehicle for delivery': 'Em Trânsito',
  'Em Veículo FedEx para Entrega': 'Em Trânsito',
  'In transit': 'Em Trânsito',
  'Left FedEx origin facility': 'Em Trânsito',
  'Saiu da Instalação FedEx de Origem': 'Em Trânsito',
  'Arrived at FedEx location': 'Em Trânsito',
  'Chegou na Localização FedEx': 'Em Trânsito',
  'At local FedEx facility': 'Em Trânsito',
  'Na Instalação FedEx Local': 'Em Trânsito',
  
  // Enviado -> Em Trânsito (após saída de produção)
  'Enviado': 'Em Trânsito',
  'Shipped': 'Em Trânsito',
  
  // Desembaraço variations - unificar para "Em Desembaraço"
  'Desembaraço': 'Em Desembaraço',
  'In clearance': 'Em Desembaraço',
  'Customs cleared': 'Em Desembaraço',
  'Liberado pela Alfândega': 'Em Desembaraço',
  'Package available for clearance': 'Em Desembaraço',
  'Pacote Disponível para Desembaraço': 'Em Desembaraço',
  
  // Armazém variations
  'No Armazem': 'No Armazém',
  'Warehouse': 'No Armazém',
  'At warehouse': 'No Armazém',
  
  // Produção variations
  'Em Producao': 'Em Produção',
  'In Production': 'Em Produção',
  'Production': 'Em Produção',
  
  // Entregue variations
  'Delivered': 'Entregue',
  
  // Consolidação
  'Em Consolidação': 'Em Consolidação',
  'Consolidation': 'Em Consolidação',
  
  // Aguardando Embarque
  'Aguardando Embarque': 'Aguardando Embarque',
  'Waiting for shipping': 'Aguardando Embarque',
  
};

// Estágios válidos do sistema (3 gargalos críticos + outros)
export const VALID_STAGES = [
  'Em Produção',      // GARGALO 1
  'No Armazém',       // GARGALO 2
  'Em Desembaraço',   // GARGALO 3
  'Em Trânsito',
  'Entregue',
  'Em Consolidação',
  'Aguardando Embarque',
];

// SLAs por estágio em dias úteis (baseado na regra de 10 dias úteis total)
export const STAGE_SLAS: Record<string, number> = {
  'Em Produção': 5,      // Máximo 5 dias úteis em produção
  'No Armazém': 2,       // Máximo 2 dias úteis no armazém
  'Em Desembaraço': 2,   // Máximo 2 dias úteis em desembaraço
  'Em Trânsito': 3,      // Máximo 3 dias em trânsito internacional
  'Entregue': 0,         // N/A
};

/**
 * Normaliza um status para o padrão do sistema
 */
export function normalizeStatus(status: string | null | undefined): string {
  if (!status) return 'Em Produção'; // Default
  
  const trimmed = status.trim();
  
  // Verificar mapeamento direto
  if (STATUS_NORMALIZATION_MAP[trimmed]) {
    return STATUS_NORMALIZATION_MAP[trimmed];
  }
  
  // Verificar mapeamento case-insensitive
  const statusLower = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(STATUS_NORMALIZATION_MAP)) {
    if (key.toLowerCase() === statusLower) {
      return value;
    }
  }
  
  // Verificar por palavras-chave
  if (statusLower.includes('produção') || statusLower.includes('producao') || statusLower.includes('production')) {
    return 'Em Produção';
  }
  if (statusLower.includes('armazém') || statusLower.includes('armazem') || statusLower.includes('warehouse') || statusLower.includes('miami')) {
    return 'No Armazém';
  }
  if (statusLower.includes('desembaraço') || statusLower.includes('desembaraco') || statusLower.includes('clearance') || statusLower.includes('customs') || statusLower.includes('alfândega')) {
    return 'Em Desembaraço';
  }
  if (statusLower.includes('trânsito') || statusLower.includes('transito') || statusLower.includes('transit') || statusLower.includes('fedex')) {
    return 'Em Trânsito';
  }
  if (statusLower.includes('entregue') || statusLower.includes('delivered')) {
    return 'Entregue';
  }
  if (statusLower.includes('consolidação') || statusLower.includes('consolidacao')) {
    return 'Em Consolidação';
  }
  if (statusLower.includes('embarque')) {
    return 'Aguardando Embarque';
  }
  
  // Se não reconhecido, retornar como está mas logar warning
  console.warn(`[StatusNormalizer] Status não reconhecido: "${status}"`);
  return trimmed;
}

/**
 * Verifica se um status é um dos 3 gargalos críticos
 */
export function isCriticalBottleneck(status: string): boolean {
  const normalized = normalizeStatus(status);
  return ['Em Produção', 'No Armazém', 'Em Desembaraço'].includes(normalized);
}

/**
 * Calcula dias úteis entre duas datas
 */
export function calculateBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calcula dias corridos entre duas datas
 */
export function calculateCalendarDays(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

// SLA de entrega: 15 dias corridos após saída da fábrica
export const DELIVERY_SLA_DAYS = 15;

/**
 * Verifica se um pedido está atrasado baseado no SLA de 15 dias corridos
 */
export function isOverdueBySLA(dataEnvio: string | null, isDelivered: boolean): boolean {
  if (isDelivered) return false;
  if (!dataEnvio) return false;
  
  const shipDate = new Date(dataEnvio);
  const today = new Date();
  const calendarDays = calculateCalendarDays(shipDate, today);
  
  return calendarDays > DELIVERY_SLA_DAYS;
}
