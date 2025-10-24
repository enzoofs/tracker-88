-- Add data_entrega column to cargas table
ALTER TABLE public.cargas 
ADD COLUMN data_entrega timestamp with time zone;