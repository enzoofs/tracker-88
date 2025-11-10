-- Fix customer contact info exposure by restricting access to admins and assigned customers only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read contact info" ON public.clientes_contact_info;

-- Create a new restrictive policy that allows:
-- 1. Admins to read all contact info
-- 2. Regular users to read only contact info for their assigned customers
CREATE POLICY "Users can read assigned customer contact info"
ON public.clientes_contact_info
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1
    FROM public.customer_assignments ca
    INNER JOIN public.clientes c ON c.nome = ca.cliente_nome
    WHERE ca.user_id = auth.uid()
    AND c.id = clientes_contact_info.cliente_id
  )
);