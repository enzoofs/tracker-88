-- ============================================
-- FASE 1: Criar tabela de rastreamento de tentativas
-- ============================================
CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  success boolean NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  blocked_until timestamptz
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_time ON auth_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_blocked ON auth_attempts(blocked_until);

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem visualizar tentativas de autenticação
CREATE POLICY "Admins can view auth attempts"
ON auth_attempts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role pode inserir (para edge functions)
CREATE POLICY "Service role can insert auth attempts"
ON auth_attempts FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- FASE 2: Criar tabela de auditoria de segurança
-- ============================================
CREATE TABLE IF NOT EXISTS security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  ip_address text,
  success boolean NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_time ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log(action);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs de auditoria
CREATE POLICY "Admins can view security logs"
ON security_audit_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role pode inserir
CREATE POLICY "Service role can insert security logs"
ON security_audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- FASE 3: Atualizar políticas RLS - clientes_contact_info
-- ============================================
-- Remover política que permite todos autenticados lerem
DROP POLICY IF EXISTS "Authenticated users can read all contact info" ON clientes_contact_info;

-- Criar política restrita: apenas admins ou usuários designados
CREATE POLICY "Users can read assigned client contact info"
ON clientes_contact_info FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 
    FROM customer_assignments ca
    JOIN clientes c ON c.id = clientes_contact_info.cliente_id
    WHERE ca.user_id = auth.uid()
    AND ca.cliente_nome = c.nome
  )
);

-- ============================================
-- FASE 4: Atualizar políticas RLS - envios_processados
-- ============================================
-- Remover política que permite todos autenticados lerem
DROP POLICY IF EXISTS "Authenticated users can read all envios" ON envios_processados;

-- Criar política restrita: apenas admins ou usuários designados aos clientes
CREATE POLICY "Users can read assigned client envios"
ON envios_processados FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 
    FROM customer_assignments ca
    WHERE ca.user_id = auth.uid()
    AND ca.cliente_nome = envios_processados.cliente
  )
);

-- ============================================
-- FASE 5: Atualizar políticas RLS - carga_historico
-- ============================================
-- Remover política que permite todos autenticados inserirem
DROP POLICY IF EXISTS "Allow authenticated insert carga_hist" ON carga_historico;

-- Criar política restrita: apenas admins podem inserir
CREATE POLICY "Only admins can insert carga history"
ON carga_historico FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FASE 6: Criar função para detectar acessos suspeitos
-- ============================================
CREATE OR REPLACE FUNCTION log_bulk_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Contar quantos registros foram acessados recentemente por este usuário
  SELECT COUNT(*) INTO recent_count
  FROM security_audit_log
  WHERE user_id = auth.uid()
  AND resource_type = TG_TABLE_NAME
  AND created_at > now() - interval '1 minute';
  
  -- Se mais de 50 acessos em 1 minuto, registrar como suspeito
  IF recent_count > 50 THEN
    INSERT INTO security_audit_log (
      user_id,
      action,
      resource_type,
      success,
      details
    ) VALUES (
      auth.uid(),
      'BULK_ACCESS_ATTEMPT',
      TG_TABLE_NAME,
      false,
      jsonb_build_object(
        'count', recent_count,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- FASE 7: Criar função de limpeza automática
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_auth_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deletar registros antigos (> 7 dias)
  DELETE FROM auth_attempts 
  WHERE attempted_at < now() - interval '7 days';
  
  -- Deletar logs de auditoria antigos (> 30 dias)
  DELETE FROM security_audit_log
  WHERE created_at < now() - interval '30 days';
END;
$$;