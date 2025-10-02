-- Phase 1: Implement Role-Based Access Control (RBAC)

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create customer_assignments table to control access
CREATE TABLE public.customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, cliente_nome)
);

ALTER TABLE public.customer_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Update profiles table - remove role column (data will be migrated to user_roles)
-- First, migrate existing roles to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 
  CASE 
    WHEN role = 'admin' THEN 'admin'::app_role
    ELSE 'user'::app_role
  END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Drop the old role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- 6. Update RLS policies for profiles table
DROP POLICY IF EXISTS "Allow users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;

-- Users can read all profiles
CREATE POLICY "Users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile data (not roles)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only admins can insert profiles
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Secure clientes table with proper RLS
DROP POLICY IF EXISTS "Allow authenticated read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow authenticated update clientes" ON public.clientes;

-- Admins can do everything
CREATE POLICY "Admins can read all clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert clientes"
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clientes"
ON public.clientes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Regular users can only read assigned customers
CREATE POLICY "Users can read assigned clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_assignments
    WHERE customer_assignments.user_id = auth.uid()
      AND customer_assignments.cliente_nome = clientes.nome
  )
);

-- 8. Secure envios_processados table with proper RLS
DROP POLICY IF EXISTS "Allow authenticated read envios" ON public.envios_processados;
DROP POLICY IF EXISTS "Allow authenticated insert envios" ON public.envios_processados;
DROP POLICY IF EXISTS "Allow authenticated update envios" ON public.envios_processados;

-- Admins can do everything
CREATE POLICY "Admins can read all envios"
ON public.envios_processados
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert envios"
ON public.envios_processados
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update envios"
ON public.envios_processados
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Regular users can only read orders for their assigned customers
CREATE POLICY "Users can read assigned envios"
ON public.envios_processados
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_assignments
    WHERE customer_assignments.user_id = auth.uid()
      AND customer_assignments.cliente_nome = envios_processados.cliente
  )
);

-- 9. RLS policies for user_roles (only admins can manage)
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. RLS policies for customer_assignments (only admins can manage)
CREATE POLICY "Admins can read all assignments"
ON public.customer_assignments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert assignments"
ON public.customer_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignments"
ON public.customer_assignments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can read their own assignments
CREATE POLICY "Users can read own assignments"
ON public.customer_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());