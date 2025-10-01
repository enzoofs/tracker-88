-- Create tables for logistics management system

-- 1. Profiles table (for user data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Clientes table
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Envios Processados (main shipments table)
CREATE TABLE IF NOT EXISTS public.envios_processados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order TEXT NOT NULL UNIQUE,
  erp_order TEXT,
  web_order TEXT,
  cliente TEXT NOT NULL,
  produtos JSONB,
  valor_total NUMERIC(10,2),
  status TEXT DEFAULT 'Em Produção',
  status_atual TEXT DEFAULT 'Em Produção',
  status_cliente TEXT,
  ultima_localizacao TEXT DEFAULT 'Fornecedor',
  tracking_numbers TEXT[],
  data_ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Cargas table (cargo/shipment batches)
CREATE TABLE IF NOT EXISTS public.cargas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_carga TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'Em Preparação',
  tipo_temperatura TEXT,
  data_chegada_prevista TIMESTAMP WITH TIME ZONE,
  data_embarque TIMESTAMP WITH TIME ZONE,
  origem TEXT,
  destino TEXT,
  mawb TEXT,
  hawb TEXT,
  transportadora TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Carga Sales Orders (junction table)
CREATE TABLE IF NOT EXISTS public.carga_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_carga TEXT NOT NULL,
  so_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(numero_carga, so_number)
);

-- 6. Carga Histórico (cargo history/timeline)
CREATE TABLE IF NOT EXISTS public.carga_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_carga TEXT NOT NULL,
  evento TEXT NOT NULL,
  descricao TEXT,
  localizacao TEXT,
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Shipment History (sales order history/timeline)
CREATE TABLE IF NOT EXISTS public.shipment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Notification Queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id SERIAL PRIMARY KEY,
  sales_order TEXT,
  cliente TEXT,
  tipo_notificacao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  prioridade TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pendente',
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT now(),
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. Notificacoes (sent notifications archive)
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order TEXT,
  cliente TEXT,
  tipo TEXT,
  titulo TEXT,
  mensagem TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Tracking Master (tracking numbers registry)
CREATE TABLE IF NOT EXISTS public.tracking_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT NOT NULL UNIQUE,
  sales_order TEXT,
  numero_carga TEXT,
  tipo TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios_processados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carga_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carga_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allowing authenticated users to read, admins to write)
-- For now, allow all authenticated users full access (adjust based on your needs)

CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read envios" ON public.envios_processados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert envios" ON public.envios_processados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update envios" ON public.envios_processados FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read cargas" ON public.cargas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert cargas" ON public.cargas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update cargas" ON public.cargas FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read carga_so" ON public.carga_sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert carga_so" ON public.carga_sales_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read carga_hist" ON public.carga_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert carga_hist" ON public.carga_historico FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read ship_hist" ON public.shipment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert ship_hist" ON public.shipment_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read notif_queue" ON public.notification_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert notif_queue" ON public.notification_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update notif_queue" ON public.notification_queue FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read notificacoes" ON public.notificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert notificacoes" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read tracking" ON public.tracking_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert tracking" ON public.tracking_master FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update tracking" ON public.tracking_master FOR UPDATE TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX idx_envios_sales_order ON public.envios_processados(sales_order);
CREATE INDEX idx_envios_cliente ON public.envios_processados(cliente);
CREATE INDEX idx_cargas_numero ON public.cargas(numero_carga);
CREATE INDEX idx_carga_so_numero ON public.carga_sales_orders(numero_carga);
CREATE INDEX idx_carga_so_so ON public.carga_sales_orders(so_number);
CREATE INDEX idx_notif_status ON public.notification_queue(status);
CREATE INDEX idx_tracking_number ON public.tracking_master(tracking_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_envios_updated_at BEFORE UPDATE ON public.envios_processados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cargas_updated_at BEFORE UPDATE ON public.cargas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tracking_updated_at BEFORE UPDATE ON public.tracking_master
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();