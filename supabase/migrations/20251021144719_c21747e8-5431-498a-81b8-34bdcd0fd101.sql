-- ============================================
-- ATUALIZAÇÃO MANUAL: Carga 893 (Ciclo Completo)
-- ============================================

-- 1.1 Atualizar carga 893
UPDATE cargas SET
  status = 'Entregue',
  data_embarque = '2025-10-11',
  data_chegada_prevista = '2025-10-12',
  ultima_localizacao = 'Entregue',
  updated_at = NOW()
WHERE numero_carga = '893';

-- 1.2 Criar eventos na timeline da carga 893
INSERT INTO carga_historico (numero_carga, evento, descricao, localizacao, data_evento)
VALUES 
  ('893', 'Embarque', 'Carga embarcada com sucesso', 'Miami, FL', '2025-10-11 08:00:00'),
  ('893', 'Chegada', 'Carga chegou ao Brasil', 'Viracopos, SP', '2025-10-12 14:00:00'),
  ('893', 'Desembaraço', 'Carga desembaraçada pela Receita Federal', 'Viracopos, SP', '2025-10-17 16:00:00'),
  ('893', 'Entrega', 'Carga entregue ao destinatário final', 'São Paulo, SP', '2025-10-20 10:00:00');

-- 1.3 Atualizar SOs da carga 893
UPDATE envios_processados SET
  status_atual = 'Entregue',
  status_cliente = 'Entregue',
  is_delivered = true,
  data_ultima_atualizacao = NOW()
WHERE sales_order IN ('23077050', '23077808', '23077829');

-- ============================================
-- ATUALIZAÇÃO MANUAL: Carga 892 (Aguardando Desembaraço)
-- ============================================

-- 2.1 Atualizar carga 892
UPDATE cargas SET
  status = 'Chegada no Brasil',
  data_embarque = '2025-10-15',
  data_chegada_prevista = '2025-10-16',
  ultima_localizacao = 'Viracopos, SP - Aguardando Liberação',
  updated_at = NOW()
WHERE numero_carga = '892';

-- 2.2 Criar eventos na timeline da carga 892
INSERT INTO carga_historico (numero_carga, evento, descricao, localizacao, data_evento)
VALUES 
  ('892', 'Embarque', 'Carga embarcada com sucesso', 'Miami, FL', '2025-10-15 08:00:00'),
  ('892', 'Chegada', 'Carga chegou ao Brasil - Aguardando desembaraço', 'Viracopos, SP', '2025-10-16 14:00:00');

-- 2.3 Atualizar SOs da carga 892
UPDATE envios_processados SET
  status_atual = 'Chegada no Brasil',
  status_cliente = 'Em Importação',
  is_delivered = false,
  data_ultima_atualizacao = NOW()
WHERE sales_order IN (
  '23031478', '23037667', '23047804', '23050568', '23055026', 
  '23057429', '23061663', '23066438', '23071073', '23075181',
  '23076490', '23076518', '23080111', '23080112'
);