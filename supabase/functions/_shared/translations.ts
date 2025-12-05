// Traduções compartilhadas para Edge Functions
export const STATUS_TRANSLATIONS: Record<string, string> = {
  // FedEx statuses
  'Departed FedEx location': 'Saiu da Localização FedEx',
  'At FedEx destination facility': 'Na Instalação FedEx de Destino',
  'On FedEx vehicle for delivery': 'Em Veículo FedEx para Entrega',
  'In transit': 'Em Trânsito',
  'Delivered': 'Entregue',
  'Shipment exception': 'Exceção no Envio',
  'Held at FedEx location': 'Retido na Localização FedEx',
  'Picked up': 'Coletado',
  'At local FedEx facility': 'Na Instalação FedEx Local',
  'In clearance': 'Em Desembaraço',
  'Customs cleared': 'Liberado pela Alfândega',
  'Left FedEx origin facility': 'Saiu da Instalação FedEx de Origem',
  'Arrived at FedEx location': 'Chegou na Localização FedEx',
  'Shipment information sent': 'Informações de Envio Transmitidas',
  'Package available for clearance': 'Pacote Disponível para Desembaraço',
  
  // Common location translations
  'MEMPHIS': 'Memphis',
  'MIAMI': 'Miami',
  'INDIANAPOLIS': 'Indianápolis',
  'SAO PAULO': 'São Paulo',
  'RIO DE JANEIRO': 'Rio de Janeiro',
  'GUARULHOS': 'Guarulhos',
};

export function translateFedExStatus(status: string): string {
  if (!status) return status;
  
  // Try exact match first
  if (STATUS_TRANSLATIONS[status]) {
    return STATUS_TRANSLATIONS[status];
  }
  
  // Try partial match (case insensitive)
  const statusLower = status.toLowerCase();
  for (const [key, value] of Object.entries(STATUS_TRANSLATIONS)) {
    if (statusLower.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return status;
}

// Mapear status FedEx para estágios lógicos do sistema
// Foca nos 3 gargalos críticos: Em Produção, No Armazém, Desembaraço
export function mapToLogicalStage(status: string, location: string): string {
  const statusLower = (status || '').toLowerCase();
  const locationLower = (location || '').toLowerCase();
  
  // GARGALO 1: Em Produção
  if (statusLower.includes('produção') || statusLower.includes('producao') || statusLower.includes('production')) {
    return 'Em Produção';
  }
  
  // GARGALO 2: No Armazém (inclui Miami warehouse)
  if (
    statusLower.includes('armazém') || 
    statusLower.includes('armazem') || 
    statusLower.includes('warehouse') ||
    locationLower.includes('miami')
  ) {
    return 'No Armazém';
  }
  
  // GARGALO 3: Desembaraço (unificar todas as variações)
  if (
    statusLower.includes('desembaraço') || 
    statusLower.includes('desembaraco') || 
    statusLower.includes('em desembaraço') ||
    statusLower.includes('clearance') || 
    statusLower.includes('customs') || 
    statusLower.includes('alfândega') ||
    statusLower.includes('alfandega')
  ) {
    return 'Desembaraço';
  }
  
  // Entregue (estágio final)
  if (statusLower.includes('entregue') || statusLower.includes('delivered')) {
    return 'Entregue';
  }
  
  // Status FedEx que indicam trânsito (não são gargalos)
  if (
    statusLower.includes('departed') ||
    statusLower.includes('arrived') ||
    statusLower.includes('in transit') ||
    statusLower.includes('em trânsito') ||
    statusLower.includes('left') ||
    statusLower.includes('saiu') ||
    statusLower.includes('fedex') ||
    statusLower.includes('enviado') ||
    statusLower.includes('shipped')
  ) {
    return 'Em Trânsito';
  }
  
  // Qualquer outro status = ignorar (não registrar no histórico)
  return 'Atualizado';
}

// Normalizar status para garantir consistência
export function normalizeStatusForDB(status: string): string {
  const mapped = mapToLogicalStage(status, '');
  
  // Se não for um estágio reconhecido, manter o original
  if (mapped === 'Atualizado') {
    return status;
  }
  
  return mapped;
}
