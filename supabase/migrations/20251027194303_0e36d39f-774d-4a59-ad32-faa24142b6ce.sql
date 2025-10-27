-- Drop existing restrictive SELECT policies for non-admins
DROP POLICY IF EXISTS "Users can read assigned envios" ON public.envios_processados;
DROP POLICY IF EXISTS "Users can read assigned cargas" ON public.cargas;
DROP POLICY IF EXISTS "Users can read notifications for assigned customers" ON public.notification_queue;
DROP POLICY IF EXISTS "Users can update notifications for assigned customers" ON public.notification_queue;
DROP POLICY IF EXISTS "Users can read assigned clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can read contact info for assigned customers" ON public.clientes_contact_info;

-- Create new policies allowing all authenticated users to read all data
CREATE POLICY "Authenticated users can read all envios"
ON public.envios_processados
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read all cargas"
ON public.cargas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read all notifications"
ON public.notification_queue
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read all clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read all contact info"
ON public.clientes_contact_info
FOR SELECT
TO authenticated
USING (true);

-- Keep admin-only policies for modifications (INSERT, UPDATE, DELETE remain unchanged)