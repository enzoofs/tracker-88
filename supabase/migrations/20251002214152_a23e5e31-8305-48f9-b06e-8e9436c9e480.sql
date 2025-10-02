-- Add missing fields to envios_processados table
ALTER TABLE public.envios_processados 
ADD COLUMN IF NOT EXISTS is_at_warehouse boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_delivered boolean DEFAULT false;