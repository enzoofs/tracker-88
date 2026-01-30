#!/usr/bin/env python3
"""
Script de Auditoria e Validação de Dados de Cargas (SNT-16)

Este script escaneia as pastas de cargas, extrai datas de envio das planilhas
"Dados {nº}.xlsx" (aba SR1) e valida/preenche no Supabase via Edge Functions.

Uso:
    python audit_cargo_data.py --dry-run                    # Preview sem modificar
    python audit_cargo_data.py --interactive                # Modo interativo
    python audit_cargo_data.py --auto-fill                  # Preenche automaticamente
    python audit_cargo_data.py --report-only                # Gera apenas relatório
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import argparse

try:
    import pandas as pd
    from openpyxl import load_workbook
    import requests
except ImportError as e:
    print(f"Erro: Biblioteca necessaria nao instalada: {e}")
    print("\nInstale as dependencias:")
    print("  pip install pandas openpyxl requests")
    sys.exit(1)


class CargoDataAuditor:
    """Auditor de dados de cargas via Edge Functions"""

    def __init__(self, supabase_url: str, supabase_anon_key: str, base_path: str = r"C:\IMPORTAÇÕES"):
        self.base_path = Path(base_path)
        self.supabase_url = supabase_url.rstrip('/')
        self.supabase_anon_key = supabase_anon_key
        # Cache de SOs já consultadas (evita chamadas repetidas)
        self._so_cache: Dict[str, Optional[Dict]] = {}
        self.report: List[Dict] = []
        self.stats = {
            'cargas_scanned': 0,
            'planilhas_found': 0,
            'sos_extracted': 0,
            'sos_found_in_db': 0,
            'sos_not_found': 0,
            'missing_data_envio': 0,
            'divergences': 0,
            'auto_filled': 0,
            'errors': 0
        }

    def _invoke_edge_function(self, function_name: str, body: dict) -> dict:
        """Chama uma Edge Function do Supabase via HTTP POST"""
        url = f"{self.supabase_url}/functions/v1/{function_name}"
        headers = {
            'Content-Type': 'application/json',
            'apikey': self.supabase_anon_key,
            'Authorization': f'Bearer {self.supabase_anon_key}',
        }
        response = requests.post(url, json=body, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()

    def batch_query_sos(self, so_numbers: List[str]) -> Dict[str, Dict]:
        """
        Consulta múltiplas SOs de uma vez via Edge Function query-envios.
        Retorna dict mapeando sales_order -> dados da SO.
        """
        # Deduplica
        unique_sos = list(set(so_numbers))

        # Filtra SOs já em cache
        uncached = [so for so in unique_sos if so not in self._so_cache]

        if uncached:
            # Batch em grupos de 500
            for i in range(0, len(uncached), 500):
                batch = uncached[i:i+500]
                try:
                    result = self._invoke_edge_function('query-envios', {
                        'sales_orders': batch
                    })
                    data = result.get('data', [])
                    found_sos = set()
                    for so_data in data:
                        so_key = so_data['sales_order']
                        self._so_cache[so_key] = so_data
                        found_sos.add(so_key)
                    # Marcar SOs não encontradas como None no cache
                    for so in batch:
                        if so not in found_sos:
                            self._so_cache[so] = None
                except Exception as e:
                    print(f"  Erro ao consultar batch de SOs: {e}")
                    self.stats['errors'] += 1
                    for so in batch:
                        self._so_cache[so] = None

        return {so: self._so_cache.get(so) for so in unique_sos}

    def batch_update_data_envio(self, updates: List[Dict]) -> int:
        """
        Atualiza data_envio para múltiplas SOs via Edge Function update-envio-data.
        updates: [{ sales_order: str, data_envio: str (ISO) }]
        Retorna quantidade de atualizações bem-sucedidas.
        """
        if not updates:
            return 0

        success_count = 0
        # Batch em grupos de 200
        for i in range(0, len(updates), 200):
            batch = updates[i:i+200]
            try:
                result = self._invoke_edge_function('update-envio-data', {
                    'updates': batch
                })
                success_count += result.get('updated', 0)
            except Exception as e:
                print(f"  Erro ao atualizar batch: {e}")
                self.stats['errors'] += 1

        return success_count

    def scan_cargo_folders(self) -> List[Tuple[str, Path]]:
        """
        Escaneia as pastas de cargas e retorna lista de (numero_carga, caminho)

        Estrutura esperada:
        C:\IMPORTAÇÕES\IMPORTAÇÃO {ANO}\CARGA {NUM} - {TIPO} - {SIGLA}\
        """
        cargo_folders = []

        if not self.base_path.exists():
            print(f"  Pasta base nao encontrada: {self.base_path}")
            return cargo_folders

        cargo_pattern = re.compile(r"CARGA\s+(\d+)", re.IGNORECASE)

        for year_folder in self.base_path.iterdir():
            if not year_folder.is_dir():
                continue

            if not re.match(r"IMPORTA[ÇC][ÃA]O\s+\d{4}", year_folder.name, re.IGNORECASE):
                continue

            # FILTRO: Apenas cargas de 2026 (mais recentes)
            if "2026" not in year_folder.name:
                continue

            print(f"  Escaneando: {year_folder.name}")

            for cargo_folder in year_folder.iterdir():
                if not cargo_folder.is_dir():
                    continue

                match = cargo_pattern.search(cargo_folder.name)
                if match:
                    cargo_num = match.group(1)
                    cargo_folders.append((cargo_num, cargo_folder))
                    self.stats['cargas_scanned'] += 1

        return cargo_folders

    def find_dados_spreadsheet(self, cargo_folder: Path, cargo_num: str) -> Optional[Path]:
        """Procura pela planilha "Dados {nº}.xlsx" dentro da pasta da carga"""
        patterns = [
            f"Dados {cargo_num}.xlsx",
            f"Dados_{cargo_num}.xlsx",
            f"dados{cargo_num}.xlsx",
            f"Dados{cargo_num}.xlsx"
        ]

        for file in cargo_folder.iterdir():
            if file.is_file() and file.suffix.lower() in ['.xlsx', '.xls']:
                if any(pattern.lower() in file.name.lower() for pattern in patterns):
                    return file

        return None

    def extract_sr1_data(self, spreadsheet_path: Path) -> List[Dict]:
        """
        Extrai dados da aba SR1 da planilha.
        Retorna lista de {so: str, ship_date: datetime} com SOs únicas.
        """
        try:
            df = pd.read_excel(spreadsheet_path, sheet_name='SR1', engine='openpyxl')

            if len(df.columns) < 5:
                print(f"  Planilha tem menos de 5 colunas: {spreadsheet_path.name}")
                return []

            ship_date_col = df.columns[2]  # Coluna C
            so_col = df.columns[4]         # Coluna E

            # Usar dict para deduplicar por SO (mantém primeira ocorrência com data)
            so_map: Dict[str, Optional[datetime]] = {}

            for idx, row in df.iterrows():
                ship_date = row[ship_date_col]
                so_number = row[so_col]

                if pd.isna(so_number) or str(so_number).strip() == '':
                    continue

                if isinstance(so_number, float):
                    so_str = str(int(so_number))
                else:
                    so_str = str(so_number).strip()

                # Se já temos essa SO com data, pular
                if so_str in so_map and so_map[so_str] is not None:
                    continue

                parsed_date = None
                if not pd.isna(ship_date):
                    try:
                        if isinstance(ship_date, datetime):
                            parsed_date = ship_date
                        elif isinstance(ship_date, str):
                            for fmt in ['%m/%d/%Y %I:%M:%S %p', '%d/%m/%Y', '%Y-%m-%d']:
                                try:
                                    parsed_date = datetime.strptime(ship_date.strip(), fmt)
                                    break
                                except ValueError:
                                    continue
                    except Exception as e:
                        print(f"  Erro ao parsear data '{ship_date}' para SO {so_str}: {e}")

                # Só sobrescreve se nova data é melhor (não-None)
                if so_str not in so_map or (parsed_date is not None and so_map[so_str] is None):
                    so_map[so_str] = parsed_date

            return [{'so': so, 'ship_date': date} for so, date in so_map.items()]

        except Exception as e:
            print(f"  Erro ao ler planilha {spreadsheet_path.name}: {e}")
            self.stats['errors'] += 1
            return []

    def audit_cargo(self, cargo_num: str, cargo_folder: Path, auto_fill: bool = False) -> Dict:
        """Audita uma carga específica"""
        print(f"\n--- Auditando CARGA {cargo_num}: {cargo_folder.name}")

        spreadsheet = self.find_dados_spreadsheet(cargo_folder, cargo_num)

        if not spreadsheet:
            print(f"  Planilha 'Dados {cargo_num}.xlsx' nao encontrada")
            return {'found': False}

        print(f"  Planilha encontrada: {spreadsheet.name}")
        self.stats['planilhas_found'] += 1

        sr1_data = self.extract_sr1_data(spreadsheet)

        if not sr1_data:
            print(f"  Nenhum dado extraido da aba SR1")
            return {'found': True, 'extracted': 0}

        print(f"  {len(sr1_data)} SOs unicas extraidas da aba SR1")
        self.stats['sos_extracted'] += len(sr1_data)

        # Batch query: consultar todas SOs da carga de uma vez
        so_numbers = [d['so'] for d in sr1_data]
        db_sos = self.batch_query_sos(so_numbers)

        found_count = sum(1 for v in db_sos.values() if v is not None)
        not_found_count = sum(1 for v in db_sos.values() if v is None)
        self.stats['sos_found_in_db'] += found_count
        self.stats['sos_not_found'] += not_found_count

        if not_found_count > 0:
            print(f"  {found_count} encontradas no DB, {not_found_count} nao encontradas")

        cargo_report = {
            'cargo': cargo_num,
            'folder': str(cargo_folder),
            'spreadsheet': spreadsheet.name,
            'total_sos': len(sr1_data),
            'found_in_db': found_count,
            'not_found': not_found_count,
            'missing_data_envio': [],
            'divergences': [],
            'filled': []
        }

        # Coletar updates para batch
        pending_updates: List[Dict] = []

        for so_data in sr1_data:
            so_number = so_data['so']
            ship_date = so_data['ship_date']

            db_so = db_sos.get(so_number)
            if not db_so:
                continue

            db_data_envio = db_so.get('data_envio')

            if not db_data_envio:
                self.stats['missing_data_envio'] += 1
                cargo_report['missing_data_envio'].append({
                    'so': so_number,
                    'ship_date_planilha': ship_date.isoformat() if ship_date else None
                })

                if auto_fill and ship_date:
                    pending_updates.append({
                        'sales_order': so_number,
                        'data_envio': ship_date.isoformat()
                    })
                    cargo_report['filled'].append(so_number)
                else:
                    date_str = ship_date.strftime('%d/%m/%Y') if ship_date else 'N/A'
                    print(f"  SO {so_number}: data_envio AUSENTE (planilha: {date_str})")

            elif ship_date:
                db_date = datetime.fromisoformat(db_data_envio.replace('Z', '+00:00')).replace(tzinfo=None)
                diff_days = abs((db_date - ship_date).days)

                if diff_days > 1:
                    self.stats['divergences'] += 1
                    cargo_report['divergences'].append({
                        'so': so_number,
                        'db_date': db_date.strftime('%d/%m/%Y'),
                        'planilha_date': ship_date.strftime('%d/%m/%Y'),
                        'diff_days': diff_days
                    })
                    print(f"  SO {so_number}: DIVERGENCIA - DB: {db_date.strftime('%d/%m/%Y')} vs Planilha: {ship_date.strftime('%d/%m/%Y')} ({diff_days} dias)")

        # Executar batch update se auto_fill
        if pending_updates:
            print(f"  Atualizando {len(pending_updates)} SOs com data_envio...")
            updated = self.batch_update_data_envio(pending_updates)
            self.stats['auto_filled'] += updated
            print(f"  {updated} SOs atualizadas com sucesso")

        self.report.append(cargo_report)
        return cargo_report

    def generate_report(self, output_path: str = "audit_report.csv"):
        """Gera relatório CSV"""
        if not self.report:
            print("\n  Nenhum dado para gerar relatorio")
            return

        rows = []

        for cargo_data in self.report:
            cargo = cargo_data['cargo']

            for missing in cargo_data.get('missing_data_envio', []):
                rows.append({
                    'Carga': cargo,
                    'SO': missing['so'],
                    'Tipo': 'FALTANTE',
                    'Data_Planilha': missing.get('ship_date_planilha', 'N/A'),
                    'Data_DB': 'N/A',
                    'Diferenca_Dias': 'N/A',
                    'Status': 'Preenchido' if missing['so'] in cargo_data.get('filled', []) else 'Pendente'
                })

            for div in cargo_data.get('divergences', []):
                rows.append({
                    'Carga': cargo,
                    'SO': div['so'],
                    'Tipo': 'DIVERGENCIA',
                    'Data_Planilha': div['planilha_date'],
                    'Data_DB': div['db_date'],
                    'Diferenca_Dias': div['diff_days'],
                    'Status': 'Revisar'
                })

        if rows:
            df = pd.DataFrame(rows)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"\n  Relatorio gerado: {output_path}")
            print(f"  Total de issues: {len(rows)}")
        else:
            print("\n  Nenhuma divergencia ou campo faltante encontrado!")

    def print_summary(self):
        """Imprime resumo da auditoria"""
        print("\n" + "="*60)
        print("  RESUMO DA AUDITORIA")
        print("="*60)
        print(f"Cargas escaneadas:           {self.stats['cargas_scanned']}")
        print(f"Planilhas encontradas:       {self.stats['planilhas_found']}")
        print(f"SOs extraidas (unicas):      {self.stats['sos_extracted']}")
        print(f"SOs encontradas no DB:       {self.stats['sos_found_in_db']}")
        print(f"SOs NAO encontradas no DB:   {self.stats['sos_not_found']}")
        print(f"SOs sem data_envio:          {self.stats['missing_data_envio']}")
        print(f"Divergencias encontradas:    {self.stats['divergences']}")
        print(f"Preenchimentos automaticos:  {self.stats['auto_filled']}")
        print(f"Erros:                       {self.stats['errors']}")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(description='Auditoria de Dados de Cargas (SNT-16)')
    parser.add_argument('--dry-run', action='store_true', help='Preview sem modificar dados')
    parser.add_argument('--auto-fill', action='store_true', help='Preenche dados faltantes automaticamente')
    parser.add_argument('--interactive', action='store_true', help='Modo interativo (pergunta antes de preencher)')
    parser.add_argument('--report-only', action='store_true', help='Gera apenas relatorio CSV')
    parser.add_argument('--base-path', default=r"C:\IMPORTAÇÕES", help='Caminho base das importacoes')
    parser.add_argument('--output', default='audit_report.csv', help='Arquivo de saida do relatorio')

    args = parser.parse_args()

    # Credenciais Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://aldwmdfveivkfxxvfoua.supabase.co')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZHdtZGZ2ZWl2a2Z4eHZmb3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjIxMzksImV4cCI6MjA3NDc5ODEzOX0.uo82xCuNAN9wb6QpbBDxdHNruRCzwRuup6VxgEjvlKM')

    print("Iniciando Auditoria de Dados de Cargas (SNT-16)")
    print(f"  Pasta base: {args.base_path}")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"  Acesso via: Edge Functions (query-envios, update-envio-data)")

    if args.dry_run:
        print("  Modo: DRY-RUN (sem modificacoes)")
    elif args.auto_fill:
        print("  Modo: AUTO-FILL (preenchera dados automaticamente)")
    elif args.report_only:
        print("  Modo: REPORT-ONLY (apenas relatorio)")

    auditor = CargoDataAuditor(SUPABASE_URL, SUPABASE_ANON_KEY, args.base_path)

    cargo_folders = auditor.scan_cargo_folders()

    if not cargo_folders:
        print("\n  Nenhuma pasta de carga encontrada!")
        sys.exit(0)

    print(f"\n  {len(cargo_folders)} cargas encontradas")

    for cargo_num, cargo_folder in cargo_folders:
        auditor.audit_cargo(
            cargo_num,
            cargo_folder,
            auto_fill=(args.auto_fill and not args.dry_run and not args.report_only)
        )

    auditor.generate_report(args.output)
    auditor.print_summary()


if __name__ == '__main__':
    main()
