-- Enable RLS on remaining tables
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carga_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carga_sales_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for remaining tables
-- Notification queue policies
CREATE POLICY "Authenticated users can view all notifications" 
ON public.notification_queue 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert notifications" 
ON public.notification_queue 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update notifications" 
ON public.notification_queue 
FOR UPDATE 
TO authenticated
USING (true);

-- Notificacoes policies
CREATE POLICY "Authenticated users can view all notificacoes" 
ON public.notificacoes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert notificacoes" 
ON public.notificacoes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update notificacoes" 
ON public.notificacoes 
FOR UPDATE 
TO authenticated
USING (true);

-- Carga historico policies
CREATE POLICY "Authenticated users can view all carga historico" 
ON public.carga_historico 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert carga historico" 
ON public.carga_historico 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Carga sales orders policies
CREATE POLICY "Authenticated users can view all carga sales orders" 
ON public.carga_sales_orders 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert carga sales orders" 
ON public.carga_sales_orders 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update carga sales orders" 
ON public.carga_sales_orders 
FOR UPDATE 
TO authenticated
USING (true);