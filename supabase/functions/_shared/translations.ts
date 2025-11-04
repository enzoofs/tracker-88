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
