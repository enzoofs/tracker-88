-- Ajustar permissões: apenas enzo@sintesebio.com.br deve ser admin
-- Remover todas as roles admin existentes
DELETE FROM user_roles WHERE role = 'admin';

-- Adicionar role admin apenas para enzo@sintesebio.com.br
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'enzo@sintesebio.com.br'
ON CONFLICT (user_id, role) DO NOTHING;