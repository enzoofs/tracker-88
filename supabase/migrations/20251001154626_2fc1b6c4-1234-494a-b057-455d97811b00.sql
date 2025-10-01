-- Enable realtime for envios_processados table
ALTER PUBLICATION supabase_realtime ADD TABLE public.envios_processados;

-- Enable realtime for cargas table
ALTER PUBLICATION supabase_realtime ADD TABLE public.cargas;

-- Enable realtime for notification_queue table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;