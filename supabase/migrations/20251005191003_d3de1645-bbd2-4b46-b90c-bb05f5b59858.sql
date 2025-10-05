-- Add missing columns to envios_processados table

-- Add carrier column with default 'FedEx'
ALTER TABLE public.envios_processados 
ADD COLUMN IF NOT EXISTS carrier TEXT DEFAULT 'FedEx';

-- Add ship_to column
ALTER TABLE public.envios_processados 
ADD COLUMN IF NOT EXISTS ship_to TEXT;

-- Change tracking_numbers from ARRAY to TEXT (if it's currently an array)
-- First, convert any existing array data to text
ALTER TABLE public.envios_processados 
ALTER COLUMN tracking_numbers TYPE TEXT USING array_to_string(tracking_numbers, ',');

-- Add data_envio column
ALTER TABLE public.envios_processados 
ADD COLUMN IF NOT EXISTS data_envio TIMESTAMPTZ;

-- Add index on carrier for better query performance
CREATE INDEX IF NOT EXISTS idx_envios_processados_carrier ON public.envios_processados(carrier);

-- Add index on data_envio for better query performance
CREATE INDEX IF NOT EXISTS idx_envios_processados_data_envio ON public.envios_processados(data_envio);