-- Enable RLS on existing tables that dashboard will use
ALTER TABLE public.envios_processados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Create policies for logistics data (allowing all authenticated users to view all data)
-- This is appropriate for internal logistics dashboard where users need to see all shipments

-- Envios processados policies
CREATE POLICY "Authenticated users can view all envios" 
ON public.envios_processados 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update envios" 
ON public.envios_processados 
FOR UPDATE 
TO authenticated
USING (true);

-- Cargas policies
CREATE POLICY "Authenticated users can view all cargas" 
ON public.cargas 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update cargas" 
ON public.cargas 
FOR UPDATE 
TO authenticated
USING (true);

-- Shipment history policies
CREATE POLICY "Authenticated users can view all shipment history" 
ON public.shipment_history 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert shipment history" 
ON public.shipment_history 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Tracking master policies
CREATE POLICY "Authenticated users can view all tracking" 
ON public.tracking_master 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update tracking" 
ON public.tracking_master 
FOR UPDATE 
TO authenticated
USING (true);

-- Clientes policies
CREATE POLICY "Authenticated users can view all clientes" 
ON public.clientes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update clientes" 
ON public.clientes 
FOR UPDATE 
TO authenticated
USING (true);