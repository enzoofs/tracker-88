-- Adicionar campo data_armazem na tabela cargas (se não existir)
ALTER TABLE cargas ADD COLUMN IF NOT EXISTS data_armazem TIMESTAMP WITH TIME ZONE;

-- Normalizar status das cargas (ENTREGUE -> Entregue)
UPDATE cargas 
SET status = 'Entregue' 
WHERE LOWER(status) = 'entregue' AND status != 'Entregue';

-- Atualizar status em envios_processados para pedidos entregues
UPDATE envios_processados 
SET status = 'Entregue', status_atual = 'Entregue', status_cliente = 'Entregue'
WHERE is_delivered = true AND status != 'Entregue';

-- Preencher data_armazem a partir do shipment_history existente
UPDATE cargas c
SET data_armazem = (
  SELECT MIN(sh.timestamp)
  FROM shipment_history sh
  JOIN carga_sales_orders cso ON cso.so_number = sh.sales_order
  WHERE cso.numero_carga = c.numero_carga
  AND sh.status = 'No Armazém'
)
WHERE c.data_armazem IS NULL;