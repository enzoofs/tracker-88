-- Corrigir políticas RLS para permitir acesso a usuários autenticados
-- Manter proteção apenas para operações de escrita

-- ========================================
-- ENVIOS_PROCESSADOS
-- ========================================
-- Remover política restritiva antiga
DROP POLICY IF EXISTS "usuarios_assigned_envios" ON envios_processados;
DROP POLICY IF EXISTS "Users can read assigned client envios" ON envios_processados;

-- Permitir leitura para todos autenticados
CREATE POLICY "Authenticated users can read envios"
ON envios_processados
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- CLIENTES_CONTACT_INFO
-- ========================================
-- Remover política restritiva antiga
DROP POLICY IF EXISTS "usuarios_assigned_clientes" ON clientes_contact_info;
DROP POLICY IF EXISTS "Users can read assigned client contact info" ON clientes_contact_info;

-- Permitir leitura para todos autenticados
CREATE POLICY "Authenticated users can read contact info"
ON clientes_contact_info
FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- CARGAS
-- ========================================
-- Manter as políticas atuais que já permitem leitura autenticada

-- ========================================
-- SHIPMENT_HISTORY
-- ========================================
-- Já está OK - permite leitura autenticada

-- ========================================
-- CARGA_SALES_ORDERS
-- ========================================
-- Já está OK - permite leitura autenticada

-- ========================================
-- NOTIFICATION_QUEUE
-- ========================================
-- Já está OK - permite leitura autenticada

-- ========================================
-- ACTIVE_ALERTS
-- ========================================
-- Já está OK - permite leitura autenticada