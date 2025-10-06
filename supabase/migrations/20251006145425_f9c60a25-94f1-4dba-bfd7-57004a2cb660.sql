-- Add data_ordem column to envios_processados table
ALTER TABLE public.envios_processados 
ADD COLUMN data_ordem timestamp with time zone;