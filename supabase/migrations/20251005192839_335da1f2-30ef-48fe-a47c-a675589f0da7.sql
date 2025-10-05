-- Ensure RLS is enabled on clientes_contact_info
ALTER TABLE public.clientes_contact_info ENABLE ROW LEVEL SECURITY;

-- Add policy for users to read contact info for their assigned customers
CREATE POLICY "Users can read contact info for assigned customers"
ON public.clientes_contact_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    JOIN public.customer_assignments ca ON c.nome = ca.cliente_nome
    WHERE c.id = clientes_contact_info.cliente_id
      AND ca.user_id = auth.uid()
  )
);