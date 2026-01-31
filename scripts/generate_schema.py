#!/usr/bin/env python3
"""
Generate clean SQL schema from OpenAPI spec and TypeScript types.
This script extracts the REAL schema from the PostgREST OpenAPI endpoint.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Tuple

# Type mappings from OpenAPI to PostgreSQL
TYPE_MAPPINGS = {
    'uuid': 'UUID',
    'text': 'TEXT',
    'integer': 'INTEGER',
    'number': 'NUMERIC',
    'boolean': 'BOOLEAN',
    'timestamp with time zone': 'TIMESTAMP WITH TIME ZONE',
    'timestamp without time zone': 'TIMESTAMP WITHOUT TIME ZONE',
    'jsonb': 'JSONB',
    'public.app_role': 'TEXT',  # We'll create the ENUM separately
}

def parse_openapi_schema(openapi_path: Path) -> Dict[str, Any]:
    """Parse OpenAPI spec and extract table definitions."""
    with open(openapi_path, 'r', encoding='utf-8') as f:
        spec = json.load(f)

    return spec.get('definitions', {})

def get_pg_type(field_def: Dict[str, Any], col_name: str = '') -> str:
    """Convert OpenAPI type definition to PostgreSQL type."""
    format_type = field_def.get('format', '')
    json_type = field_def.get('type', '')

    # Special case for user_roles.role - use enum type
    if col_name == 'role' and format_type == 'public.app_role':
        return 'public.app_role'

    # Check format first (more specific)
    if format_type in TYPE_MAPPINGS:
        return TYPE_MAPPINGS[format_type]

    # Check JSON type
    if json_type == 'string':
        return 'TEXT'
    elif json_type == 'integer':
        return 'INTEGER'
    elif json_type == 'number':
        return 'NUMERIC'
    elif json_type == 'boolean':
        return 'BOOLEAN'
    elif json_type == 'array':
        return 'TEXT[]'  # Generic array

    # Default to JSONB for complex types
    return 'JSONB'

def get_column_definition(col_name: str, col_def: Dict[str, Any], required_cols: List[str], table_name: str = '') -> str:
    """Generate PostgreSQL column definition."""
    pg_type = get_pg_type(col_def, col_name)
    parts = [f'  {col_name} {pg_type}']

    # Add default value
    default = col_def.get('default')

    # Special handling for boolean fields that should default to false
    if pg_type == 'BOOLEAN' and default is None:
        if col_name in ['is_at_warehouse', 'is_delivered']:
            default = False

    if default is not None:
        if default == 'gen_random_uuid()' or default == 'now()':
            parts.append(f'DEFAULT {default}')
        elif isinstance(default, bool):
            parts.append(f'DEFAULT {str(default).lower()}')
        elif isinstance(default, str):
            parts.append(f"DEFAULT '{default}'")
        else:
            parts.append(f'DEFAULT {default}')

    # Add NOT NULL for required columns (except if it has a default)
    if col_name in required_cols and default is None:
        parts.append('NOT NULL')

    return ' '.join(parts)

def generate_create_table_sql(table_name: str, table_def: Dict[str, Any]) -> str:
    """Generate CREATE TABLE SQL statement."""
    properties = table_def.get('properties', {})
    required = table_def.get('required', [])

    # Generate column definitions
    columns = []
    for col_name, col_def in properties.items():
        col_sql = get_column_definition(col_name, col_def, required, table_name)
        columns.append(col_sql)

    # Add primary key constraint
    if 'id' in properties:
        pk_type = get_pg_type(properties['id'])
        if pk_type == 'UUID':
            # UUID primary keys
            columns = [f'  id UUID PRIMARY KEY DEFAULT gen_random_uuid()'] + [c for c in columns if not c.strip().startswith('id ')]
        elif pk_type == 'INTEGER':
            # Serial primary keys
            columns = [f'  id SERIAL PRIMARY KEY'] + [c for c in columns if not c.strip().startswith('id ')]

    sql = f'CREATE TABLE IF NOT EXISTS public.{table_name} (\n'
    sql += ',\n'.join(columns)
    sql += '\n);'

    return sql

def generate_indexes() -> List[str]:
    """Generate CREATE INDEX statements."""
    return [
        'CREATE INDEX IF NOT EXISTS idx_envios_sales_order ON public.envios_processados(sales_order);',
        'CREATE INDEX IF NOT EXISTS idx_envios_cliente ON public.envios_processados(cliente);',
        'CREATE INDEX IF NOT EXISTS idx_envios_processados_carrier ON public.envios_processados(carrier);',
        'CREATE INDEX IF NOT EXISTS idx_envios_processados_data_envio ON public.envios_processados(data_envio);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_cargas_numero ON public.cargas(numero_carga);',
        'CREATE INDEX IF NOT EXISTS idx_cargas_invoices ON public.cargas USING GIN (invoices);',
        'CREATE INDEX IF NOT EXISTS idx_cargas_hawb ON public.cargas(hawb);',
        'CREATE INDEX IF NOT EXISTS idx_cargas_data_embarque_prevista ON public.cargas(data_embarque_prevista);',
        'CREATE INDEX IF NOT EXISTS idx_cargas_data_chegada_prevista ON public.cargas(data_chegada_prevista);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_carga_so_numero ON public.carga_sales_orders(numero_carga);',
        'CREATE INDEX IF NOT EXISTS idx_carga_so_so ON public.carga_sales_orders(so_number);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_notif_status ON public.notification_queue(status);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_tracking_number ON public.tracking_master(tracking_number);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_shipment_history_tracking ON public.shipment_history(tracking_number);',
        'CREATE INDEX IF NOT EXISTS idx_shipment_history_sales_order ON public.shipment_history(sales_order);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON public.alert_rules(active);',
        'CREATE INDEX IF NOT EXISTS idx_active_alerts_status ON public.active_alerts(status);',
        'CREATE INDEX IF NOT EXISTS idx_active_alerts_sales_order ON public.active_alerts(sales_order);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON public.auth_attempts(ip_address);',
        'CREATE INDEX IF NOT EXISTS idx_auth_attempts_time ON public.auth_attempts(attempted_at);',
        'CREATE INDEX IF NOT EXISTS idx_auth_attempts_blocked ON public.auth_attempts(blocked_until);',
        '',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_time ON public.security_audit_log(created_at);',
        'CREATE INDEX IF NOT EXISTS idx_security_audit_action ON public.security_audit_log(action);',
    ]

def generate_foreign_keys() -> List[str]:
    """Generate ALTER TABLE statements for foreign keys."""
    return [
        'ALTER TABLE IF EXISTS public.active_alerts DROP CONSTRAINT IF EXISTS active_alerts_rule_id_fkey;',
        'ALTER TABLE public.active_alerts ADD CONSTRAINT active_alerts_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id);',
        '',
        'ALTER TABLE IF EXISTS public.clientes_contact_info DROP CONSTRAINT IF EXISTS clientes_contact_info_cliente_id_fkey;',
        'ALTER TABLE public.clientes_contact_info ADD CONSTRAINT clientes_contact_info_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);',
    ]

def generate_triggers() -> str:
    """Generate trigger function and triggers for updated_at columns."""
    return """
-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
DROP TRIGGER IF EXISTS update_tracking_master_updated_at ON public.tracking_master;
CREATE TRIGGER update_tracking_master_updated_at BEFORE UPDATE ON public.tracking_master
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_alert_rules_updated_at ON public.alert_rules;
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON public.alert_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_envios_processados_updated_at ON public.envios_processados;
CREATE TRIGGER update_envios_processados_updated_at BEFORE UPDATE ON public.envios_processados
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_contact_info_updated_at ON public.clientes_contact_info;
CREATE TRIGGER update_clientes_contact_info_updated_at BEFORE UPDATE ON public.clientes_contact_info
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cargas_updated_at ON public.cargas;
CREATE TRIGGER update_cargas_updated_at BEFORE UPDATE ON public.cargas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
"""

def generate_functions() -> str:
    """Generate helper functions used by the application."""
    return """
-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old auth attempts (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_attempts()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.auth_attempts
    WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill shipment history from envios_processados
CREATE OR REPLACE FUNCTION public.backfill_shipment_history()
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.shipment_history (sales_order, status, location, timestamp)
    SELECT
        sales_order,
        status_atual,
        ultima_localizacao,
        data_ultima_atualizacao
    FROM public.envios_processados
    WHERE NOT EXISTS (
        SELECT 1 FROM public.shipment_history sh
        WHERE sh.sales_order = envios_processados.sales_order
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

def generate_rls_enable() -> List[str]:
    """Generate ALTER TABLE statements to enable RLS."""
    tables = [
        'active_alerts', 'alert_rules', 'auth_attempts', 'carga_historico',
        'carga_sales_orders', 'cargas', 'clientes', 'clientes_contact_info',
        'customer_assignments', 'envios_processados', 'notificacoes',
        'notification_queue', 'profiles', 'security_audit_log',
        'shipment_history', 'tracking_master', 'user_roles'
    ]

    return [f'ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;' for table in tables]

def main():
    """Main function to generate the schema."""
    script_dir = Path(__file__).parent
    openapi_path = script_dir / 'openapi_spec.json'
    output_path = script_dir / 'full_schema.sql'

    print("Parsing OpenAPI spec...")
    definitions = parse_openapi_schema(openapi_path)

    # Table creation order (respecting foreign keys)
    table_order = [
        'profiles',
        'user_roles',
        'clientes',
        'clientes_contact_info',
        'customer_assignments',
        'alert_rules',
        'active_alerts',
        'envios_processados',
        'cargas',
        'carga_sales_orders',
        'carga_historico',
        'shipment_history',
        'tracking_master',
        'notificacoes',
        'notification_queue',
        'auth_attempts',
        'security_audit_log',
    ]

    print("Generating SQL schema...")
    sql_output = []

    # Header
    sql_output.append('-- Síntese Tracker - Full Schema')
    sql_output.append('-- Generated from PostgREST OpenAPI endpoint')
    sql_output.append('-- This is a CLEAN schema without circular dependencies')
    sql_output.append('')
    sql_output.append('-- Enable UUID extension')
    sql_output.append('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    sql_output.append('')

    # Create enum type
    sql_output.append('-- Create enum type for user roles')
    sql_output.append('DO $$ BEGIN')
    sql_output.append('    CREATE TYPE public.app_role AS ENUM (\'admin\', \'user\');')
    sql_output.append('EXCEPTION')
    sql_output.append('    WHEN duplicate_object THEN null;')
    sql_output.append('END $$;')
    sql_output.append('')

    # Create tables
    sql_output.append('-- ============================================================')
    sql_output.append('-- TABLE DEFINITIONS')
    sql_output.append('-- ============================================================')
    sql_output.append('')

    for table_name in table_order:
        if table_name in definitions:
            sql_output.append(f'-- Table: {table_name}')
            sql_output.append(generate_create_table_sql(table_name, definitions[table_name]))
            sql_output.append('')

    # Create indexes
    sql_output.append('')
    sql_output.append('-- ============================================================')
    sql_output.append('-- INDEXES')
    sql_output.append('-- ============================================================')
    sql_output.append('')
    sql_output.extend(generate_indexes())
    sql_output.append('')

    # Create foreign keys
    sql_output.append('')
    sql_output.append('-- ============================================================')
    sql_output.append('-- FOREIGN KEYS')
    sql_output.append('-- ============================================================')
    sql_output.append('')
    sql_output.extend(generate_foreign_keys())
    sql_output.append('')

    # Create triggers
    sql_output.append('')
    sql_output.append('-- ============================================================')
    sql_output.append('-- TRIGGERS')
    sql_output.append('-- ============================================================')
    sql_output.append(generate_triggers())
    sql_output.append('')

    # Create functions
    sql_output.append(generate_functions())
    sql_output.append('')

    # Enable RLS
    sql_output.append('')
    sql_output.append('-- ============================================================')
    sql_output.append('-- ROW LEVEL SECURITY')
    sql_output.append('-- ============================================================')
    sql_output.append('-- Enable RLS on all tables (policies to be added later)')
    sql_output.append('')
    sql_output.extend(generate_rls_enable())
    sql_output.append('')

    # Write output
    print(f"Writing schema to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_output))

    print(f"[OK] Schema generated successfully: {output_path}")
    print(f"  Tables: {len(table_order)}")
    print(f"  Indexes: {len([i for i in generate_indexes() if i.strip()])}")

if __name__ == '__main__':
    main()
