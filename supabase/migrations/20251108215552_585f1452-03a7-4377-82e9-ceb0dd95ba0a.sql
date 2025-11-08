-- Função para preencher histórico retroativo baseado em status atual
-- Esta função analisa os envios e cria registros históricos lógicos

CREATE OR REPLACE FUNCTION backfill_shipment_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  envio RECORD;
  last_history_status TEXT;
  current_stage TEXT;
BEGIN
  -- Para cada envio processado
  FOR envio IN 
    SELECT 
      sales_order,
      status_atual,
      data_ordem,
      data_envio,
      created_at,
      data_ultima_atualizacao,
      is_delivered,
      ultima_localizacao
    FROM envios_processados
    WHERE sales_order IS NOT NULL
  LOOP
    -- Verificar último status no histórico
    SELECT status INTO last_history_status
    FROM shipment_history
    WHERE sales_order = envio.sales_order
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Mapear status_atual para estágio lógico
    current_stage := CASE
      WHEN envio.status_atual = 'Entregue' OR envio.is_delivered = true THEN 'Entregue'
      WHEN envio.status_atual = 'No Armazém' THEN 'Desembaraço'
      WHEN envio.status_atual LIKE '%Desembaraço%' THEN 'Desembaraço'
      WHEN envio.status_atual LIKE '%Brasil%' OR envio.ultima_localizacao LIKE '%Brasil%' OR envio.ultima_localizacao LIKE '%São Paulo%' THEN 'Chegada no Brasil'
      WHEN envio.status_atual = 'Enviado' OR envio.status_atual LIKE '%Trânsito%' THEN 'Em Trânsito'
      WHEN envio.status_atual = 'Em Produção' THEN NULL -- Não criar histórico para produção
      ELSE 'Enviado'
    END;
    
    -- Se não há histórico e o status atual indica que foi enviado
    IF last_history_status IS NULL AND current_stage IS NOT NULL THEN
      
      -- 1. Criar registro "Enviado" se foi enviado
      IF envio.data_envio IS NOT NULL AND current_stage != 'Enviado' THEN
        INSERT INTO shipment_history (sales_order, status, location, timestamp)
        VALUES (
          envio.sales_order,
          'Enviado',
          'Origem',
          COALESCE(envio.data_envio, envio.data_ordem, envio.created_at)
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- 2. Criar registro "Em Trânsito" se passou dessa fase
      IF current_stage IN ('Chegada no Brasil', 'Desembaraço', 'Entregue') THEN
        INSERT INTO shipment_history (sales_order, status, location, timestamp)
        VALUES (
          envio.sales_order,
          'Em Trânsito',
          'Internacional',
          COALESCE(envio.data_envio, envio.data_ordem, envio.created_at) + INTERVAL '1 day'
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- 3. Criar registro "Chegada no Brasil" se passou dessa fase
      IF current_stage IN ('Desembaraço', 'Entregue') THEN
        INSERT INTO shipment_history (sales_order, status, location, timestamp)
        VALUES (
          envio.sales_order,
          'Chegada no Brasil',
          'Brasil',
          COALESCE(envio.data_ultima_atualizacao, envio.created_at)
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- 4. Criar registro "Desembaraço" se passou dessa fase
      IF current_stage = 'Entregue' AND envio.status_atual != 'Enviado' THEN
        INSERT INTO shipment_history (sales_order, status, location, timestamp)
        VALUES (
          envio.sales_order,
          'Desembaraço',
          'Alfândega',
          COALESCE(envio.data_ultima_atualizacao, envio.created_at)
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      -- 5. Criar registro atual se diferente
      IF current_stage IS NOT NULL THEN
        INSERT INTO shipment_history (sales_order, status, location, timestamp)
        VALUES (
          envio.sales_order,
          current_stage,
          COALESCE(envio.ultima_localizacao, 'Atualizado'),
          COALESCE(envio.data_ultima_atualizacao, envio.created_at)
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Histórico retroativo preenchido com sucesso';
END;
$$;

-- Executar a função para preencher histórico
SELECT backfill_shipment_history();