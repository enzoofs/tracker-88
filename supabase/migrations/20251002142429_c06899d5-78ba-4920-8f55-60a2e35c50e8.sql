-- Update existing records to set status_cliente from status_atual where it's null
UPDATE envios_processados 
SET status_cliente = status_atual 
WHERE status_cliente IS NULL;

-- Create trigger to automatically set status_cliente from status_atual on insert/update
CREATE OR REPLACE FUNCTION sync_status_cliente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status_cliente IS NULL AND NEW.status_atual IS NOT NULL THEN
    NEW.status_cliente := NEW.status_atual;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_status_cliente
  BEFORE INSERT OR UPDATE ON envios_processados
  FOR EACH ROW
  EXECUTE FUNCTION sync_status_cliente();