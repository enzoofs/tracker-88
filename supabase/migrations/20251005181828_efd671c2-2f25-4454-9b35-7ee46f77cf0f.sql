-- Add tracking_number column to shipment_history table
ALTER TABLE public.shipment_history 
ADD COLUMN tracking_number text;

-- Create index for faster lookups
CREATE INDEX idx_shipment_history_tracking ON public.shipment_history(tracking_number);

COMMENT ON COLUMN public.shipment_history.tracking_number IS 'Tracking number for the shipment event';