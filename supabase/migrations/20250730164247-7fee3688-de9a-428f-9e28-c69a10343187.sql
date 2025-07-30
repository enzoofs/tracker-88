-- Fix Critical RLS Security Issues

-- 1. Fix envios_processados policies - restrict access based on user's company/role
DROP POLICY IF EXISTS "Authenticated users can view all envios" ON public.envios_processados;
DROP POLICY IF EXISTS "Authenticated users can update envios" ON public.envios_processados;

-- Create secure user-based policies for envios_processados
CREATE POLICY "Users can view envios for their company" 
ON public.envios_processados 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.company = envios_processados.cliente)
  )
);

CREATE POLICY "Admins can update all envios" 
ON public.envios_processados 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 2. Fix cargas policies - restrict access based on user permissions
DROP POLICY IF EXISTS "Authenticated users can view all cargas" ON public.cargas;
DROP POLICY IF EXISTS "Authenticated users can update cargas" ON public.cargas;

-- Create secure policies for cargas
CREATE POLICY "Users can view cargas for their company" 
ON public.cargas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.carga_sales_orders cso ON cso.numero_carga = cargas.numero_carga
    JOIN public.envios_processados ep ON ep.sales_order = cso.so_number
    WHERE p.id = auth.uid() 
    AND (p.role = 'admin' OR p.company = ep.cliente)
  )
);

CREATE POLICY "Admins can update cargas" 
ON public.cargas 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 3. Fix notification policies - users should only see their own notifications
DROP POLICY IF EXISTS "Authenticated users can view all notifications" ON public.notification_queue;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notification_queue;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notification_queue;

-- Create secure notification policies
CREATE POLICY "Users can view notifications for their company" 
ON public.notification_queue 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.company = notification_queue.cliente)
  )
);

CREATE POLICY "Admins can insert notifications" 
ON public.notification_queue 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update notifications" 
ON public.notification_queue 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 4. Fix tracking_master policies
DROP POLICY IF EXISTS "Authenticated users can view all tracking" ON public.tracking_master;
DROP POLICY IF EXISTS "Authenticated users can update tracking" ON public.tracking_master;

CREATE POLICY "Users can view tracking for their company" 
ON public.tracking_master 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'admin' OR profiles.company = tracking_master.cliente)
  )
);

CREATE POLICY "Admins can update tracking" 
ON public.tracking_master 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- 5. Secure the profiles table - prevent role escalation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile excluding role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Only allow role changes if user is admin
    OLD.role = NEW.role 
    OR EXISTS (
      SELECT 1 FROM public.profiles admin_check 
      WHERE admin_check.id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  )
);

-- 6. Fix database functions security - add search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mapear_status_cliente(status_interno character varying)
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    CASE status_interno
        WHEN 'Em Produção' THEN
            RETURN 'Em Produção';
        WHEN 'Produção Finalizada' THEN
            RETURN 'Em Produção';
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
        WHEN 'Entregue' THEN
            RETURN 'Entregue';
        WHEN 'Entregue no Destino' THEN
            RETURN 'Entregue';
        ELSE
            RETURN 'Em Importação';
    END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_status_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    NEW.status_cliente = public.mapear_status_cliente(NEW.status_atual);
    NEW.data_ultima_atualizacao = NOW();
    RETURN NEW;
END;
$function$;