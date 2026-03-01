#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Limpeza de Cargas Antigas (< 925)

Remove do banco de dados todas as cargas cujo numero_carga numerico seja
menor que 925, junto com seus registros relacionados:
  - carga_sales_orders (por carga_id)
  - carga_historico    (por carga_id, se a tabela existir)
  - cargas             (os registros principais)

Requer a service role key para contornar RLS.

Uso:
    python cleanup_old_cargas.py --dry-run    # Preview sem apagar nada
    python cleanup_old_cargas.py              # Executa a limpeza

Variaveis de ambiente (.env):
    SUPABASE_URL               URL do projeto Supabase
    SUPABASE_SERVICE_ROLE_KEY  Service role key (nao expor no frontend)
"""

import os
import re
import sys
import argparse
from typing import Optional

try:
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Erro: biblioteca necessaria nao instalada: {e}")
    print("\nInstale as dependencias:")
    print("  pip install requests python-dotenv")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

THRESHOLD = 925  # Cargas com numero numerico < THRESHOLD serao deletadas
BATCH_SIZE = 100  # Quantos IDs enviar por requisicao DELETE


# ---------------------------------------------------------------------------
# Cliente Supabase REST
# ---------------------------------------------------------------------------


class SupabaseClient:
    """Cliente minimo para o Supabase REST API usando service role key."""

    def __init__(self, url: str, service_key: str) -> None:
        self.base_url = url.rstrip("/")
        self._headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def select(self, table: str, columns: str = "*", filters: Optional[str] = None) -> list[dict]:
        """
        Executa um SELECT na tabela indicada.

        Args:
            table:   Nome da tabela.
            columns: Colunas a retornar (ex: "id,numero_carga").
            filters: Query string de filtros PostgREST (ex: "numero_carga=lt.925").

        Returns:
            Lista de dicts com as linhas retornadas.

        Raises:
            requests.HTTPError: Se a resposta nao for 2xx.
        """
        url = f"{self.base_url}/rest/v1/{table}?select={columns}"
        if filters:
            url = f"{url}&{filters}"

        response = requests.get(url, headers=self._headers, timeout=30)
        response.raise_for_status()
        return response.json()

    def table_exists(self, table: str) -> bool:
        """Verifica se a tabela existe tentando um SELECT com limit=0."""
        url = f"{self.base_url}/rest/v1/{table}?limit=0"
        response = requests.get(url, headers=self._headers, timeout=10)
        return response.status_code == 200

    def delete_by_ids(self, table: str, id_column: str, ids: list) -> int:
        """
        Deleta linhas cujo id_column esteja na lista ids.
        Opera em batches de BATCH_SIZE para evitar URLs muito longas.

        Args:
            table:     Nome da tabela.
            id_column: Coluna usada como chave (ex: "id", "carga_id").
            ids:       Lista de valores a deletar.

        Returns:
            Total de linhas deletadas reportado pelo Supabase.

        Raises:
            requests.HTTPError: Se alguma requisicao falhar.
        """
        total_deleted = 0

        for i in range(0, len(ids), BATCH_SIZE):
            batch = ids[i : i + BATCH_SIZE]
            # PostgREST syntax: ?id=in.(1,2,3)
            values = ",".join(str(v) for v in batch)
            url = f"{self.base_url}/rest/v1/{table}?{id_column}=in.({values})"

            headers = {**self._headers, "Prefer": "return=minimal"}
            response = requests.delete(url, headers=headers, timeout=30)
            response.raise_for_status()

            # Supabase retorna 204 No Content para DELETE com return=minimal
            # A contagem exata nao e retornada nesse modo, mas o status 2xx confirma sucesso
            total_deleted += len(batch)

        return total_deleted


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def extract_numeric(numero_carga: str) -> Optional[int]:
    """
    Extrai a parte numerica de um numero_carga.

    Exemplos:
        "925"      -> 925
        "924-A"    -> 924
        "CARGA920" -> 920
        "abc"      -> None
    """
    match = re.search(r"\d+", str(numero_carga))
    if match:
        return int(match.group())
    return None


def load_credentials() -> tuple[str, str]:
    """
    Carrega as credenciais do Supabase a partir do .env ou variaveis de ambiente.

    O .env e buscado na mesma pasta deste script.

    Returns:
        Tupla (supabase_url, service_key).

    Raises:
        SystemExit: Se alguma credencial estiver ausente.
    """
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(env_path)

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL")
    if not service_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing:
        print("Erro: as seguintes variaveis de ambiente sao obrigatorias:")
        for var in missing:
            print(f"  {var}")
        print(f"\nCrie o arquivo {env_path} com base no .env.example.")
        sys.exit(1)

    return supabase_url, service_key


# ---------------------------------------------------------------------------
# Logica principal
# ---------------------------------------------------------------------------


def fetch_cargas_to_delete(client: SupabaseClient) -> list[dict]:
    """
    Consulta todas as cargas e retorna apenas aquelas cujo numero numerico < THRESHOLD.

    Returns:
        Lista de dicts com ao menos as chaves 'id' e 'numero_carga'.
    """
    print("Consultando cargas no banco de dados...")
    rows = client.select("cargas", columns="id,numero_carga")
    print(f"  Total de cargas encontradas: {len(rows)}")

    to_delete = []
    for row in rows:
        numero = row.get("numero_carga", "")
        num = extract_numeric(numero)
        if num is not None and num < THRESHOLD:
            to_delete.append(row)

    return to_delete


def print_preview(cargas: list[dict]) -> None:
    """Exibe a lista de cargas que seriam deletadas."""
    if not cargas:
        print("  Nenhuma carga encontrada com numero < 925.")
        return

    print(f"\n  Cargas que SERIAM deletadas ({len(cargas)} total):")
    # Ordena pelo numero numerico para leitura mais clara
    sorted_cargas = sorted(cargas, key=lambda r: extract_numeric(r["numero_carga"]) or 0)
    for row in sorted_cargas:
        print(f"    id={row['id']}  numero_carga={row['numero_carga']}")


def run_cleanup(
    client: SupabaseClient,
    cargas: list[dict],
    has_historico: bool,
    dry_run: bool,
) -> None:
    """
    Executa (ou simula) a sequencia de deleção:
      1. carga_sales_orders
      2. carga_historico (se existir)
      3. cargas

    Args:
        client:       Instancia do SupabaseClient.
        cargas:       Lista de dicts {'id': ..., 'numero_carga': ...} a deletar.
        has_historico: Se True, a tabela carga_historico existe.
        dry_run:      Se True, apenas exibe o que seria feito sem apagar nada.
    """
    carga_ids = [row["id"] for row in cargas]
    mode_label = "[DRY-RUN] " if dry_run else ""

    print(f"\n{mode_label}Sequencia de delecao:")
    print(f"  IDs das cargas alvo: {len(carga_ids)} registros")

    # --- carga_sales_orders ---
    print(f"\n{mode_label}1. Deletando registros em carga_sales_orders...")
    if not dry_run:
        deleted = client.delete_by_ids("carga_sales_orders", "carga_id", carga_ids)
        print(f"     {deleted} registro(s) removido(s).")
    else:
        # No dry-run, consulta para mostrar quantos existem
        rows = client.select("carga_sales_orders", columns="id,carga_id,so_number")
        affected = [r for r in rows if r.get("carga_id") in carga_ids]
        print(f"     {len(affected)} registro(s) seriam removidos.")

    # --- carga_historico ---
    if has_historico:
        print(f"\n{mode_label}2. Deletando registros em carga_historico...")
        if not dry_run:
            deleted = client.delete_by_ids("carga_historico", "carga_id", carga_ids)
            print(f"     {deleted} registro(s) removido(s).")
        else:
            rows = client.select("carga_historico", columns="id,carga_id")
            affected = [r for r in rows if r.get("carga_id") in carga_ids]
            print(f"     {len(affected)} registro(s) seriam removidos.")
    else:
        print(f"\n{mode_label}2. Tabela carga_historico nao encontrada — pulando.")

    # --- cargas ---
    step = 3 if has_historico else 2
    print(f"\n{mode_label}{step}. Deletando registros em cargas...")
    if not dry_run:
        deleted = client.delete_by_ids("cargas", "id", carga_ids)
        print(f"     {deleted} registro(s) removido(s).")
    else:
        print(f"     {len(carga_ids)} registro(s) seriam removidos.")


def print_summary(cargas: list[dict], dry_run: bool) -> None:
    """Imprime resumo final da operacao."""
    print("\n" + "=" * 60)
    print("  RESUMO")
    print("=" * 60)
    if dry_run:
        print(f"  Modo:           DRY-RUN (nenhum dado foi alterado)")
    else:
        print(f"  Modo:           EXECUCAO REAL")
    print(f"  Cargas alvo:    {len(cargas)} (numero_carga < {THRESHOLD})")
    if dry_run:
        print("\n  Para executar a limpeza real, rode sem --dry-run:")
        print("    python cleanup_old_cargas.py")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description=f"Remove cargas com numero_carga < {THRESHOLD} e seus registros relacionados."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Exibe o que seria deletado sem efetuar nenhuma alteracao no banco.",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  LIMPEZA DE CARGAS ANTIGAS")
    print(f"  Threshold: numero_carga < {THRESHOLD}")
    print("=" * 60)

    supabase_url, service_key = load_credentials()

    print(f"\nConectando ao Supabase: {supabase_url}")
    client = SupabaseClient(supabase_url, service_key)

    # Descobrir se a tabela carga_historico existe
    print("Verificando tabela carga_historico...")
    has_historico = client.table_exists("carga_historico")
    print(f"  carga_historico: {'encontrada' if has_historico else 'NAO encontrada'}")

    # Buscar cargas candidatas a delecao
    cargas_to_delete = fetch_cargas_to_delete(client)

    if not cargas_to_delete:
        print(f"\nNenhuma carga com numero < {THRESHOLD} encontrada. Nada a fazer.")
        sys.exit(0)

    # Sempre exibir o preview
    print_preview(cargas_to_delete)

    if not args.dry_run:
        # Confirmacao de seguranca para execucao real
        print(f"\nATENCAO: Esta operacao e IRREVERSIVEL.")
        print(f"  Serao deletadas {len(cargas_to_delete)} carga(s) e todos os seus registros relacionados.")
        confirm = input("  Digite 'SIM' para confirmar: ").strip()
        if confirm != "SIM":
            print("  Operacao cancelada pelo usuario.")
            sys.exit(0)

    # Executar limpeza
    try:
        run_cleanup(client, cargas_to_delete, has_historico, dry_run=args.dry_run)
    except requests.HTTPError as exc:
        print(f"\nErro HTTP durante a limpeza: {exc}")
        print(f"  Response: {exc.response.text[:400] if exc.response is not None else 'N/A'}")
        sys.exit(1)
    except requests.RequestException as exc:
        print(f"\nErro de conexao: {exc}")
        sys.exit(1)

    print_summary(cargas_to_delete, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
