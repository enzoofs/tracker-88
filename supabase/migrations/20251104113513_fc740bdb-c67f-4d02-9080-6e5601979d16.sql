-- Popular tabela clientes com dados reais de envios_processados
INSERT INTO clientes (nome, endereco)
SELECT DISTINCT 
  cliente as nome,
  ship_to as endereco
FROM envios_processados
WHERE cliente IS NOT NULL
  AND cliente != ''
  AND cliente != 'Cliente não especificado'
  AND NOT EXISTS (
    SELECT 1 FROM clientes c WHERE c.nome = envios_processados.cliente
  )
ORDER BY cliente;