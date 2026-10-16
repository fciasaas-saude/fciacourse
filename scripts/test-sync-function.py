#!/usr/bin/env python3
"""Script para testar a Edge Function sync-google-drive."""
import os
import json
import requests

# Configurações
SUPABASE_URL = "https://ujjhjgogtkmzkfaujjio.supabase.co"
# Ler a chave diretamente do .env.local para garantir que funciona
env_path = os.path.join(os.path.dirname(__file__), '..', 'apps', 'web', '.env.local')
service_role_key = None
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                service_role_key = line.split('=', 1)[1].strip().strip('"')
                break

SERVICE_ROLE_KEY = service_role_key or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/sync-google-drive"

# Parâmetros do teste
ORG_ID = "5b4f2734-b601-4977-86b4-adaccf566842" # FCIA Oficial
FOLDER_ID = "1Opd0Ly_GcXTUklAH-jHoOyLGCoXI5lP4" # Lideranca

if not SERVICE_ROLE_KEY:
    print("Erro: Variável SUPABASE_SERVICE_ROLE_KEY não definida no ambiente.")
    exit(1)

headers = {
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "organization_id": ORG_ID,
    "folder_id": FOLDER_ID
}

print(f"Disparando sync-google-drive para a pasta Lideranca...")
print(f"URL: {FUNCTION_URL}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(FUNCTION_URL, headers=headers, json=payload, timeout=60)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Resposta: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    if response.status_code == 200:
        print("\n[SUCESSO] Edge Function executada corretamente.")
    else:
        print(f"\n[ERRO] Falha na execução: {response.text}")
except Exception as e:
    print(f"[ERRO] Exceção ao chamar a função: {e}")