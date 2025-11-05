-- Create alert_rules table for storing alert configurations
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  condition text NOT NULL,
  threshold integer NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create active_alerts table for storing triggered alerts
CREATE TABLE IF NOT EXISTS public.active_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  sales_order text,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  timestamp timestamp with time zone DEFAULT now(),
  acknowledged_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_alert_rules_active ON public.alert_rules(active);
CREATE INDEX idx_active_alerts_status ON public.active_alerts(status);
CREATE INDEX idx_active_alerts_sales_order ON public.active_alerts(sales_order);

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert_rules
CREATE POLICY "Authenticated users can read alert rules"
  ON public.alert_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert alert rules"
  ON public.alert_rules FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update alert rules"
  ON public.alert_rules FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete alert rules"
  ON public.alert_rules FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for active_alerts
CREATE POLICY "Authenticated users can read active alerts"
  ON public.active_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert active alerts"
  ON public.active_alerts FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update active alerts"
  ON public.active_alerts FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete active alerts"
  ON public.active_alerts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default alert rules
INSERT INTO public.alert_rules (name, type, condition, threshold, severity, active) VALUES
('Pedidos Atrasados', 'delay', 'days_overdue', 7, 'high', true),
('Entregas Críticas', 'delivery', 'days_until_deadline', 2, 'critical', true),
('Volume Baixo', 'volume', 'monthly_orders', 5, 'medium', true),
('Sem Atualização', 'tracking', 'days_without_update', 5, 'medium', true);

-- Consolidate status fields: use status_atual as the single source of truth
-- Update any NULL status_atual from status or status_cliente
UPDATE public.envios_processados
SET status_atual = COALESCE(status_atual, status, status_cliente, 'Em Produção')
WHERE status_atual IS NULL;

-- Sync missing clients from envios_processados to clientes
INSERT INTO public.clientes (nome, endereco)
SELECT DISTINCT 
  ep.cliente as nome,
  ep.ship_to as endereco
FROM public.envios_processados ep
WHERE ep.cliente IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c WHERE c.nome = ep.cliente
  )
ORDER BY ep.cliente;

-- Add trigger to keep updated_at current for alert_rules
CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();