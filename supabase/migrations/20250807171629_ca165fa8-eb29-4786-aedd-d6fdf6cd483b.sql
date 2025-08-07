-- CRITICAL SECURITY FIX: Prevent profile role privilege escalation
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create secure policies that prevent role escalation
CREATE POLICY "Users can update their own profile (excluding role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from changing their own role
  (OLD.role IS NOT DISTINCT FROM NEW.role)
);

CREATE POLICY "Users can insert their own profile (user role only)" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id AND 
  -- Only allow 'user' role on self-insert
  (role = 'user' OR role IS NULL)
);

-- Admin-only role management policy
CREATE POLICY "Admins can update any profile role" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create audit log table for role changes
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  old_role TEXT,
  new_role TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.profile_audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_profile_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when role actually changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.profile_audit_log (
      user_id, 
      changed_by, 
      old_role, 
      new_role
    ) VALUES (
      NEW.id,
      auth.uid(),
      OLD.role,
      NEW.role
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for role change logging
DROP TRIGGER IF EXISTS profile_role_audit_trigger ON public.profiles;
CREATE TRIGGER profile_role_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_role_changes();

-- FIX DATABASE FUNCTION SECURITY: Add proper search_path to existing functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, company, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'company', 'Síntese Bio'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mapear_status_cliente(status_interno character varying)
RETURNS character varying
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    CASE status_interno
        -- Status de Produção
        WHEN 'Em Produção' THEN
            RETURN 'Em Produção';
        WHEN 'Produção Finalizada' THEN
            RETURN 'Em Produção';
            
        -- Status de Importação
        WHEN 'Saído do Fornecedor' THEN
            RETURN 'Em Importação';
        WHEN 'Chegada no Armazém' THEN
            RETURN 'Em Importação';
        WHEN 'Chegada no Armazém Internacional' THEN
            RETURN 'Em Importação';
        WHEN 'Aguardando Embarque' THEN
            RETURN 'Em Importação';
        WHEN 'Embarcado' THEN
            RETURN 'Em Importação';
            
        -- Status de Trânsito
        WHEN 'Em Trânsito Internacional' THEN
            RETURN 'Em Trânsito';
        WHEN 'Chegada no Brasil' THEN
            RETURN 'Em Trânsito';
        WHEN 'Em Desembaraço' THEN
            RETURN 'Em Trânsito';
        WHEN 'Desembaraço Concluído' THEN
            RETURN 'Em Trânsito';
        WHEN 'Liberado' THEN
            RETURN 'Em Trânsito';
        WHEN 'Em Rota de Entrega' THEN
            RETURN 'Em Trânsito';
        WHEN 'Saiu para Entrega' THEN
            RETURN 'Em Trânsito';
            
        -- Status Final
        WHEN 'Entregue' THEN
            RETURN 'Entregue';
        WHEN 'Entregue no Destino' THEN
            RETURN 'Entregue';
            
        -- Default
        ELSE
            RETURN 'Em Importação';
    END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_cliente()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
    NEW.status_cliente = mapear_status_cliente(NEW.status_atual);
    NEW.data_ultima_atualizacao = NOW();
    RETURN NEW;
END;
$$;

-- TIGHTEN RLS POLICIES: Replace overly broad policies with company-based restrictions

-- Fix clientes table - remove overly broad policies
DROP POLICY IF EXISTS "Authenticated users can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;

-- Create proper company-based policies for clientes
CREATE POLICY "Users can view clientes for their company" 
ON public.clientes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND 
    (role = 'admin' OR company = clientes.nome_cliente)
  )
);

CREATE POLICY "Admins can update clientes" 
ON public.clientes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix carga_historico table
DROP POLICY IF EXISTS "Authenticated users can view all carga historico" ON public.carga_historico;
DROP POLICY IF EXISTS "Authenticated users can insert carga historico" ON public.carga_historico;

-- Create proper policies for carga_historico
CREATE POLICY "Users can view carga historico for their shipments" 
ON public.carga_historico 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.carga_sales_orders cso ON cso.numero_carga = carga_historico.numero_carga
    JOIN public.envios_processados ep ON ep.sales_order = cso.so_number
    WHERE p.id = auth.uid() AND 
    (p.role = 'admin' OR p.company = ep.cliente)
  )
);

CREATE POLICY "Admins can insert carga historico" 
ON public.carga_historico 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix shipment_history table
DROP POLICY IF EXISTS "Authenticated users can view all shipment history" ON public.shipment_history;
DROP POLICY IF EXISTS "Authenticated users can insert shipment history" ON public.shipment_history;

-- Create proper policies for shipment_history
CREATE POLICY "Users can view shipment history for their company" 
ON public.shipment_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.envios_processados ep ON ep.sales_order = shipment_history.sales_order
    WHERE p.id = auth.uid() AND 
    (p.role = 'admin' OR p.company = ep.cliente)
  )
);

CREATE POLICY "Admins can insert shipment history" 
ON public.shipment_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix carga_sales_orders table
DROP POLICY IF EXISTS "Authenticated users can view all carga sales orders" ON public.carga_sales_orders;
DROP POLICY IF EXISTS "Authenticated users can insert carga sales orders" ON public.carga_sales_orders;
DROP POLICY IF EXISTS "Authenticated users can update carga sales orders" ON public.carga_sales_orders;

-- Create proper policies for carga_sales_orders
CREATE POLICY "Users can view carga sales orders for their company" 
ON public.carga_sales_orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.envios_processados ep ON ep.sales_order = carga_sales_orders.so_number
    WHERE p.id = auth.uid() AND 
    (p.role = 'admin' OR p.company = ep.cliente)
  )
);

CREATE POLICY "Admins can manage carga sales orders" 
ON public.carga_sales_orders 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fix notificacoes table
DROP POLICY IF EXISTS "Authenticated users can view all notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated users can insert notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "Authenticated users can update notificacoes" ON public.notificacoes;

-- Create proper policies for notificacoes
CREATE POLICY "Users can view notificacoes for their cargo" 
ON public.notificacoes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.carga_sales_orders cso ON cso.numero_carga = notificacoes.numero_carga
    JOIN public.envios_processados ep ON ep.sales_order = cso.so_number
    WHERE p.id = auth.uid() AND 
    (p.role = 'admin' OR p.company = ep.cliente)
  )
);

CREATE POLICY "Admins can manage notificacoes" 
ON public.notificacoes 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Add security comment
COMMENT ON TABLE public.profile_audit_log IS 'Audit log for tracking profile role changes - CRITICAL SECURITY TABLE';