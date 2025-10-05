-- Remove tracking_number column from shipment_history table
-- This column was added by mistake - tracking numbers are stored in envios_processados.tracking_numbers
ALTER TABLE public.shipment_history DROP COLUMN IF EXISTS tracking_number;