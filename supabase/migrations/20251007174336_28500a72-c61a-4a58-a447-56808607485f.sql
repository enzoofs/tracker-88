-- Drop existing overly permissive policies on notification_queue
DROP POLICY IF EXISTS "Allow authenticated read notif_queue" ON public.notification_queue;
DROP POLICY IF EXISTS "Allow authenticated insert notif_queue" ON public.notification_queue;
DROP POLICY IF EXISTS "Allow authenticated update notif_queue" ON public.notification_queue;

-- Create secure policies based on user roles and customer assignments

-- Admins can read all notifications
CREATE POLICY "Admins can read all notifications"
ON public.notification_queue
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.notification_queue
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update all notifications
CREATE POLICY "Admins can update all notifications"
ON public.notification_queue
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Regular users can only read notifications for their assigned customers
CREATE POLICY "Users can read notifications for assigned customers"
ON public.notification_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customer_assignments
    WHERE customer_assignments.user_id = auth.uid()
      AND customer_assignments.cliente_nome = notification_queue.cliente
  )
);

-- Regular users can only update status of notifications for their assigned customers
CREATE POLICY "Users can update notifications for assigned customers"
ON public.notification_queue
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.customer_assignments
    WHERE customer_assignments.user_id = auth.uid()
      AND customer_assignments.cliente_nome = notification_queue.cliente
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.customer_assignments
    WHERE customer_assignments.user_id = auth.uid()
      AND customer_assignments.cliente_nome = notification_queue.cliente
  )
);