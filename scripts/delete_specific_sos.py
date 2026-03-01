#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deletar SOs especificas do banco de dados.

Remove SOs da tabela envios_processados e seus vinculos em carga_sales_orders.
Ignora SOs que nao existem no banco.

Uso:
    python scripts/delete_specific_sos.py --dry-run   # Preview
    python scripts/delete_specific_sos.py              # Executar

Variaveis de ambiente (.env):
    SUPABASE_URL               URL do projeto Supabase
    SUPABASE_SERVICE_ROLE_KEY  Service role key
"""

import os
import sys
import argparse

try:
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Erro: biblioteca necessaria nao instalada: {e}")
    print("\nInstale as dependencias:")
    print("  pip install requests python-dotenv")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Lista de SOs para deletar (deduplicada)
# ---------------------------------------------------------------------------

SOS_TO_DELETE = sorted(set([
    "23239399", "23248715", "23249954", "23250064", "23211403", "23211691",
    "23222042", "23231623", "23231929", "23234082", "23238245", "23238359",
    "23239208", "23242135", "23242137", "23242713", "23243966", "23244659",
    "23245116", "23245963", "23247028", "23257846", "23259656", "23259814",
    "23260083", "23260295", "23260296", "23260351", "23261902", "23261987",
    "23262241", "23262247", "23205545", "23210414", "23211594", "23218535",
    "23221352", "23233161", "23240692", "23240918", "23242132", "23248339",
    "23248340", "23249776", "23250915", "23250916", "23250925", "23251091",
    "23251243", "23251592", "23251594", "23252052", "23255401", "23255402",
    "23255403", "23255404", "23255405", "23256045", "23256255", "23259658",
    "23259815", "23260248", "23262242", "23262244", "23262245", "23262246",
    "23262249", "23263522", "23263547", "23263560", "23264045", "23264736",
    "23264737", "23264740", "23267758", "23267694", "23255128", "23258767",
    "23259657", "23259848", "23260085", "23260377", "23260442", "23262199",
    "23264738", "23264739", "23264741", "23267533", "23267621", "23268096",
    "23269212", "23270955", "23275373", "23275379", "23279421", "23280243",
    "23280244", "23280245", "23280246", "23280945", "23260084", "23262208",
    "23267677", "23269210", "23280242", "23280249", "23280572", "23283640",
    "23284897", "23284898", "23284900", "23284901", "23287562", "23288212",
    "23288657", "23288756", "23288763", "23292015", "23292016", "23292019",
    "23292020", "23292022", "23292673", "23294998", "23295023", "23295024",
    "23295221", "23296967", "23297301", "23297673", "23297674", "23297757",
    "23300643", "23300644", "23300645", "23302407", "23287269", "23287287",
    "23292042", "23303570", "23285771", "23287415", "23287891", "23288761",
    "23288762", "23288769", "23289210", "23296888", "23297300", "23297672",
    "23302406", "23303259", "23305320", "23306809", "23307005", "23308043",
    "23309508", "23309509", "23309510", "23309511", "23309892", "23309893",
    "23310106", "23310309", "23310311", "23310313", "23310314", "23312382",
    "23312383", "23312385", "23312386", "23312414", "23316066", "23316096",
    "23316113", "23316861", "23316862", "23316864", "23316865", "23316905",
    "23317143", "23317145", "23317146", "23319019", "23322959", "23323485",
    "23323487", "23323488", "23325459", "23326650", "23326651", "23326653",
    "23328525", "23328560", "23328619", "23329500", "23329501", "23329696",
    "23329881", "23329882", "23329883", "23329884", "23329885", "23333573",
    "23333574", "23334044", "23335579", "23335654", "23335897", "23336005",
    "23337117", "23337118", "23337119", "23337121", "23337122", "23337123",
    "23337125", "23337126", "23337127", "23302123", "23306128", "23306130",
    "23332220", "23337675", "23347731", "23349821",
]))

BATCH_SIZE = 50


class SupabaseClient:
    def __init__(self, url, service_key):
        self.base_url = url.rstrip("/")
        self._headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def select(self, table, columns="*", filters=None):
        url = f"{self.base_url}/rest/v1/{table}?select={columns}"
        if filters:
            url += f"&{filters}"
        resp = requests.get(url, headers=self._headers)
        resp.raise_for_status()
        return resp.json()

    def delete(self, table, filters):
        url = f"{self.base_url}/rest/v1/{table}?{filters}"
        resp = requests.delete(url, headers=self._headers)
        resp.raise_for_status()
        return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Deletar SOs especificas")
    parser.add_argument("--dry-run", action="store_true", help="Preview sem deletar")
    args = parser.parse_args()

    # Carregar .env (scripts/ e root)
    scripts_env = os.path.join(os.path.dirname(__file__), ".env")
    root_env = os.path.join(os.path.dirname(__file__), "..", ".env")
    load_dotenv(scripts_env)
    load_dotenv(root_env)

    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        print("Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env")
        sys.exit(1)

    client = SupabaseClient(url, key)

    print(f"=== DELETAR SOs ESPECIFICAS ===")
    print(f"Total de SOs na lista: {len(SOS_TO_DELETE)}")
    print()

    # 1. Verificar quais existem no banco
    print("Verificando quais SOs existem no banco...")
    found_sos = []
    not_found = []

    for i in range(0, len(SOS_TO_DELETE), BATCH_SIZE):
        batch = SOS_TO_DELETE[i:i + BATCH_SIZE]
        so_filter = ",".join(batch)
        try:
            rows = client.select(
                "envios_processados",
                columns="sales_order,cliente",
                filters=f"sales_order=in.({so_filter})"
            )
            found_in_batch = {r["sales_order"] for r in rows}
            for so in batch:
                if so in found_in_batch:
                    cliente = next((r["cliente"] for r in rows if r["sales_order"] == so), "?")
                    found_sos.append((so, cliente))
                else:
                    not_found.append(so)
        except Exception as e:
            print(f"  Erro ao consultar batch: {e}")
            sys.exit(1)

    print(f"\n  Encontradas no banco: {len(found_sos)}")
    print(f"  Nao encontradas (ignoradas): {len(not_found)}")

    if not found_sos:
        print("\nNenhuma SO para deletar. Encerrando.")
        return

    # 2. Preview
    print(f"\n=== SOs QUE SERAO DELETADAS ({len(found_sos)}) ===")
    for so, cliente in found_sos[:20]:
        print(f"  {so}  ({cliente})")
    if len(found_sos) > 20:
        print(f"  ... e mais {len(found_sos) - 20} SOs")

    # 3. Verificar vinculos em carga_sales_orders
    found_so_numbers = [so for so, _ in found_sos]
    link_count = 0
    for i in range(0, len(found_so_numbers), BATCH_SIZE):
        batch = found_so_numbers[i:i + BATCH_SIZE]
        so_filter = ",".join(batch)
        try:
            links = client.select(
                "carga_sales_orders",
                columns="so_number",
                filters=f"so_number=in.({so_filter})"
            )
            link_count += len(links)
        except Exception:
            pass

    print(f"\n  Vinculos em carga_sales_orders: {link_count}")

    if args.dry_run:
        print("\n[DRY RUN] Nenhuma alteracao feita.")
        return

    # 4. Confirmacao
    print(f"\n{'='*50}")
    print(f"ATENCAO: Isso vai deletar {len(found_sos)} SOs e {link_count} vinculos.")
    print(f"{'='*50}")
    confirm = input("Digite SIM para confirmar: ").strip()
    if confirm != "SIM":
        print("Operacao cancelada.")
        return

    # 5. Deletar vinculos em carga_sales_orders
    print("\nDeletando vinculos em carga_sales_orders...")
    deleted_links = 0
    for i in range(0, len(found_so_numbers), BATCH_SIZE):
        batch = found_so_numbers[i:i + BATCH_SIZE]
        so_filter = ",".join(batch)
        try:
            result = client.delete("carga_sales_orders", f"so_number=in.({so_filter})")
            deleted_links += len(result)
            print(f"  Batch {i // BATCH_SIZE + 1}: {len(result)} vinculos deletados")
        except Exception as e:
            print(f"  Erro no batch: {e}")

    # 6. Deletar SOs em envios_processados
    print("\nDeletando SOs em envios_processados...")
    deleted_sos = 0
    for i in range(0, len(found_so_numbers), BATCH_SIZE):
        batch = found_so_numbers[i:i + BATCH_SIZE]
        so_filter = ",".join(batch)
        try:
            result = client.delete("envios_processados", f"sales_order=in.({so_filter})")
            deleted_sos += len(result)
            print(f"  Batch {i // BATCH_SIZE + 1}: {len(result)} SOs deletadas")
        except Exception as e:
            print(f"  Erro no batch: {e}")

    print(f"\n=== CONCLUIDO ===")
    print(f"  SOs deletadas: {deleted_sos}")
    print(f"  Vinculos deletados: {deleted_links}")


if __name__ == "__main__":
    main()
