-- Fix data visibility issues by updating profiles and RLS policies

-- 1. Update existing user profiles to set company field
UPDATE public.profiles 
SET company = 'Síntese Bio', role = 'admin'
WHERE company IS NULL;

-- 2. Update handle_new_user function to extract company from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
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

-- 3. Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Update RLS policies to allow admins to see all data

-- Update envios_processados policy
DROP POLICY IF EXISTS "Users can view envios for their company" ON public.envios_processados;
CREATE POLICY "Users can view envios for their company" ON public.envios_processados
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR company = envios_processados.cliente)
  )
);

-- Update tracking_master policy  
DROP POLICY IF EXISTS "Users can view tracking for their company" ON public.tracking_master;
CREATE POLICY "Users can view tracking for their company" ON public.tracking_master
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR company = tracking_master.cliente)
  )
);

-- Update notification_queue policy
DROP POLICY IF EXISTS "Users can view notifications for their company" ON public.notification_queue;
CREATE POLICY "Users can view notifications for their company" ON public.notification_queue
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR company = notification_queue.cliente)
  )
);

-- Update cargas policy to be simpler and allow admins
DROP POLICY IF EXISTS "Users can view cargas for their company" ON public.cargas;
CREATE POLICY "Users can view cargas for their company" ON public.cargas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.carga_sales_orders cso ON (cso.numero_carga = cargas.numero_carga)
    JOIN public.envios_processados ep ON (ep.sales_order = cso.so_number)
    WHERE p.id = auth.uid() AND p.company = ep.cliente
  )
);