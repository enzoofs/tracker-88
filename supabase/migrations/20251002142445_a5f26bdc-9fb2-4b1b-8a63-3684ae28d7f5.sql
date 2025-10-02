-- Fix security warning: Set search_path for the function
DROP TRIGGER IF EXISTS trigger_sync_status_cliente ON envios_processados;
DROP FUNCTION IF EXISTS sync_status_cliente();

CREATE OR REPLACE FUNCTION sync_status_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_cliente IS NULL AND NEW.status_atual IS NOT NULL THEN
    NEW.status_cliente := NEW.status_atual;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

CREATE TRIGGER trigger_sync_status_cliente
  BEFORE INSERT OR UPDATE ON envios_processados
  FOR EACH ROW
  EXECUTE FUNCTION sync_status_cliente();