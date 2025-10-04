-- Step 1: Secure Customer Contact Information
-- Create new table for sensitive contact data
CREATE TABLE public.clientes_contact_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cliente_id)
);

-- Enable RLS on contact info table
ALTER TABLE public.clientes_contact_info ENABLE ROW LEVEL SECURITY;

-- Only admins can access contact information
CREATE POLICY "Admins can read all contact info"
ON public.clientes_contact_info
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert contact info"
ON public.clientes_contact_info
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contact info"
ON public.clientes_contact_info
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contact info"
ON public.clientes_contact_info
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing contact data
INSERT INTO public.clientes_contact_info (cliente_id, email, telefone, created_at, updated_at)
SELECT id, email, telefone, created_at, updated_at
FROM public.clientes
WHERE email IS NOT NULL OR telefone IS NOT NULL;

-- Remove sensitive columns from clientes table
ALTER TABLE public.clientes DROP COLUMN IF EXISTS email;
ALTER TABLE public.clientes DROP COLUMN IF EXISTS telefone;

-- Add trigger for updated_at on contact_info
CREATE TRIGGER update_clientes_contact_info_updated_at
BEFORE UPDATE ON public.clientes_contact_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 2: Restrict Cargas Table Access
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated read cargas" ON public.cargas;
DROP POLICY IF EXISTS "Allow authenticated insert cargas" ON public.cargas;
DROP POLICY IF EXISTS "Allow authenticated update cargas" ON public.cargas;

-- Admin policies for cargas
CREATE POLICY "Admins can read all cargas"
ON public.cargas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert cargas"
ON public.cargas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cargas"
ON public.cargas
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cargas"
ON public.cargas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- User policy: can only see cargas linked to their assigned customers
CREATE POLICY "Users can read assigned cargas"
ON public.cargas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.carga_sales_orders cso
    JOIN public.envios_processados ep ON cso.so_number = ep.sales_order
    JOIN public.customer_assignments ca ON ep.cliente = ca.cliente_nome
    WHERE cso.numero_carga = cargas.numero_carga
      AND ca.user_id = auth.uid()
  )
);