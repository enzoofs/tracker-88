-- Adicionar colunas na tabela cargas
ALTER TABLE cargas
ADD COLUMN IF NOT EXISTS data_embarque_prevista TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_chegada_prevista TIMESTAMP,
ADD COLUMN IF NOT EXISTS hawb TEXT,
ADD COLUMN IF NOT EXISTS invoices JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_autorizacao TIMESTAMP,
ADD COLUMN IF NOT EXISTS ultima_localizacao TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cargas_invoices ON cargas USING GIN (invoices);
CREATE INDEX IF NOT EXISTS idx_cargas_hawb ON cargas(hawb);
CREATE INDEX IF NOT EXISTS idx_cargas_data_embarque_prevista ON cargas(data_embarque_prevista);
CREATE INDEX IF NOT EXISTS idx_cargas_data_chegada_prevista ON cargas(data_chegada_prevista);