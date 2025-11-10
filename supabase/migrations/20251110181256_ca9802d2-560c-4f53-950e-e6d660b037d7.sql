-- Fix notification queue exposure by restricting access to admins and assigned customers

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read all notifications" ON public.notification_queue;

-- Create a new restrictive policy that allows:
-- 1. Admins to read all notifications
-- 2. Regular users to read only notifications for their assigned customers
CREATE POLICY "Users can read assigned customer notifications"
ON public.notification_queue
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1
    FROM public.customer_assignments ca
    WHERE ca.user_id = auth.uid()
    AND ca.cliente_nome = notification_queue.cliente
  )
);