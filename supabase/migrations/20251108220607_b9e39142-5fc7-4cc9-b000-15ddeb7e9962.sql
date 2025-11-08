-- Limpar histórico de "Atualizado" (registros inúteis de updates de localização)
DELETE FROM shipment_history WHERE status = 'Atualizado';

-- Limpar histórico existente para reconstruir com lógica correta
DELETE FROM shipment_history;

-- Recriar função de backfill com foco nos 3 gargalos críticos
CREATE OR REPLACE FUNCTION backfill_shipment_history()
RETURNS void AS $$
DECLARE
  env_record RECORD;
  logical_stage TEXT;
BEGIN
  -- Processar cada envio
  FOR env_record IN 
    SELECT 
      sales_order,
      status_atual,
      data_envio,
      data_ultima_atualizacao,
      is_delivered,
      tracking_numbers
    FROM envios_processados
    WHERE sales_order IS NOT NULL
    ORDER BY COALESCE(data_envio, created_at)
  LOOP
    -- 1. Inferir estágio "Em Produção" (início do processo)
    IF env_record.data_envio IS NOT NULL THEN
      INSERT INTO shipment_history (
        sales_order,
        status,
        location,
        tracking_number,
        description,
        timestamp,
        created_at
      ) VALUES (
        env_record.sales_order,
        'Em Produção',
        'Fornecedor',
        env_record.tracking_numbers,
        '{"fonte": "Backfill - inferido de data_envio"}',
        env_record.data_envio - INTERVAL '7 days', -- Assumir 7 dias antes do envio
        NOW()
      );
    END IF;
    
    -- 2. Mapear "No Armazém" se status mencionar warehouse/armazém
    IF env_record.status_atual ILIKE '%armazém%' OR 
       env_record.status_atual ILIKE '%armazem%' OR 
       env_record.status_atual ILIKE '%warehouse%' THEN
      INSERT INTO shipment_history (
        sales_order,
        status,
        location,
        tracking_number,
        description,
        timestamp,
        created_at
      ) VALUES (
        env_record.sales_order,
        'No Armazém',
        env_record.status_atual,
        env_record.tracking_numbers,
        '{"fonte": "Backfill - mapeado de status_atual"}',
        COALESCE(env_record.data_ultima_atualizacao, NOW()),
        NOW()
      );
    END IF;
    
    -- 3. Mapear "Desembaraço" se status mencionar clearance/customs/alfândega
    IF env_record.status_atual ILIKE '%desembaraço%' OR 
       env_record.status_atual ILIKE '%desembaraco%' OR 
       env_record.status_atual ILIKE '%clearance%' OR
       env_record.status_atual ILIKE '%customs%' OR
       env_record.status_atual ILIKE '%alfândega%' OR
       env_record.status_atual ILIKE '%alfandega%' THEN
      INSERT INTO shipment_history (
        sales_order,
        status,
        location,
        tracking_number,
        description,
        timestamp,
        created_at
      ) VALUES (
        env_record.sales_order,
        'Desembaraço',
        env_record.status_atual,
        env_record.tracking_numbers,
        '{"fonte": "Backfill - mapeado de status_atual"}',
        COALESCE(env_record.data_ultima_atualizacao, NOW()),
        NOW()
      );
    END IF;
    
    -- 4. Registrar "Entregue" se is_delivered = true
    IF env_record.is_delivered THEN
      INSERT INTO shipment_history (
        sales_order,
        status,
        location,
        tracking_number,
        description,
        timestamp,
        created_at
      ) VALUES (
        env_record.sales_order,
        'Entregue',
        'Destino Final',
        env_record.tracking_numbers,
        '{"fonte": "Backfill - inferido de is_delivered"}',
        COALESCE(env_record.data_ultima_atualizacao, NOW()),
        NOW()
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Backfill concluído com foco nos 3 gargalos críticos';
END;
$$ LANGUAGE plpgsql;

-- Executar backfill
SELECT backfill_shipment_history();