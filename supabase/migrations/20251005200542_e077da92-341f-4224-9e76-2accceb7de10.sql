-- Create function to protect critical data from being overwritten
CREATE OR REPLACE FUNCTION public.protect_critical_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Protect cliente field
  IF (NEW.cliente IS NULL OR NEW.cliente = '' OR NEW.cliente = 'Cliente não especificado') 
     AND OLD.cliente IS NOT NULL 
     AND OLD.cliente != '' 
     AND OLD.cliente != 'Cliente não especificado' THEN
    NEW.cliente := OLD.cliente;
  END IF;

  -- Protect produtos field
  IF (NEW.produtos IS NULL OR NEW.produtos::text = 'null' OR NEW.produtos::text = '""' OR NEW.produtos::text = '"Produtos não especificados"') 
     AND OLD.produtos IS NOT NULL 
     AND OLD.produtos::text != 'null' 
     AND OLD.produtos::text != '""'
     AND OLD.produtos::text != '"Produtos não especificados"' THEN
    NEW.produtos := OLD.produtos;
  END IF;

  -- Protect valor_total field
  IF (NEW.valor_total IS NULL OR NEW.valor_total = 0) 
     AND OLD.valor_total IS NOT NULL 
     AND OLD.valor_total > 0 THEN
    NEW.valor_total := OLD.valor_total;
  END IF;

  -- Protect erp_order field
  IF (NEW.erp_order IS NULL OR NEW.erp_order = '') 
     AND OLD.erp_order IS NOT NULL 
     AND OLD.erp_order != '' THEN
    NEW.erp_order := OLD.erp_order;
  END IF;

  -- Protect web_order field
  IF (NEW.web_order IS NULL OR NEW.web_order = '') 
     AND OLD.web_order IS NOT NULL 
     AND OLD.web_order != '' THEN
    NEW.web_order := OLD.web_order;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to protect critical data on envios_processados
DROP TRIGGER IF EXISTS protect_critical_data_trigger ON public.envios_processados;

CREATE TRIGGER protect_critical_data_trigger
  BEFORE UPDATE ON public.envios_processados
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_critical_data();