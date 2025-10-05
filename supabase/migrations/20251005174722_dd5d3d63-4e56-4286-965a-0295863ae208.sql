-- Add tracking_number column to shipment_history
ALTER TABLE public.shipment_history 
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shipment_history_tracking 
ON public.shipment_history(tracking_number);

-- Add index for sales_order lookups
CREATE INDEX IF NOT EXISTS idx_shipment_history_sales_order 
ON public.shipment_history(sales_order);