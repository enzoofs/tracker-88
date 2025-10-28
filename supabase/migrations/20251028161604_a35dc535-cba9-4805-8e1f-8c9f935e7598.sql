-- Delete carga 891 que não existe mais
DELETE FROM carga_sales_orders WHERE numero_carga = '891';
DELETE FROM carga_historico WHERE numero_carga = '891';
DELETE FROM cargas WHERE numero_carga = '891';