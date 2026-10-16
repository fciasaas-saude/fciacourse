#!/usr/bin/env python3
"""
Script para auditar credenciais da Service Account e localizar pastas criadas no Google Drive.
Obtém metadados completos (ID, link, proprietário) e partilha a pasta raiz com o utilizador.
"""
import os
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configurações
SCOPES = ['https://www.googleapis.com/auth/drive']
SERVICE_ACCOUNT_FILE = os.environ.get('GOOGLE_SERVICE_ACCOUNT_KEY_PATH', 'service-account-key.json')
USER_EMAIL = 'fciaoficial@gmail.com'  # Email do utilizador para partilhar a pasta

def get_credentials():
    """Obtém credenciais da service account."""
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Erro: Arquivo de chave não encontrado em {SERVICE_ACCOUNT_FILE}")
        sys.exit(1)
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return credentials

def main():
    print("=" * 80)
    print("AUDITORIA DE CREDENCIAIS E LOCALIZACAO DE PASTAS NO GOOGLE DRIVE")
    print("=" * 80)

    credentials = get_credentials()
    service = build('drive', 'v3', credentials=credentials)

    # 1. Auditoria das credenciais ativas
    client_email = credentials.service_account_email
    print(f"\n1. CREDENCIAIS ATIVAS:")
    print(f"   Client Email: {client_email}")
    print(f"   Scopes: {', '.join(credentials.scopes)}")

    # 2. Procurar pasta raiz FCIA_COURSE_ENGINE
    print(f"\n2. PROCURANDO PASTA RAIZ 'FCIA_COURSE_ENGINE'...")
    query = "name = 'FCIA_COURSE_ENGINE' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, fields="files(id, name, parents, owners, webViewLink, createdTime)").execute()
    files = results.get('files', [])

    if not files:
        print("   Pasta 'FCIA_COURSE_ENGINE' não encontrada.")
        print("   Nota: As pastas foram criadas no espaço isolado da Service Account.")
        sys.exit(1)

    root_folder = files[0]
    root_folder_id = root_folder['id']
    root_folder_link = root_folder.get('webViewLink', 'N/A')
    root_folder_owners = root_folder.get('owners', [])
    owner_email = root_folder_owners[0]['emailAddress'] if root_folder_owners else 'Desconhecido'

    print(f"   [ENCONTRADA]")
    print(f"   Nome: {root_folder['name']}")
    print(f"   Folder ID: {root_folder_id}")
    print(f"   URL Direta: {root_folder_link}")
    print(f"   Proprietário: {owner_email}")

    # 3. Listar subpastas principais
    print(f"\n3. SUBPASTAS PRINCIPAIS:")
    children_query = f"'{root_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    children_results = service.files().list(
        q=children_query,
        fields="files(id, name, webViewLink)",
        orderBy='name'
    ).execute()
    children = children_results.get('files', [])

    # Tabela de saída
    print("\n" + "=" * 80)
    print(f"{'Nome da Pasta':<30} {'Folder ID':<40} {'URL Direta'}")
    print("-" * 80)
    print(f"{root_folder['name']:<30} {root_folder_id:<40} {root_folder_link}")

    for child in children:
        child_id = child['id']
        child_name = child['name']
        child_link = child.get('webViewLink', 'N/A')
        print(f"{child_name:<30} {child_id:<40} {child_link}")

    print("=" * 80)

    # 4. Verificar permissões e partilhar com o utilizador
    print(f"\n4. VERIFICACAO DE PERMISSOES:")
    print(f"   A pasta foi criada pela Service Account: {client_email}")
    print(f"   Proprietário técnico: {owner_email}")

    # Partilhar a pasta raiz com o utilizador
    print(f"\n5. PARTILHANDO PASTA COM O UTILIZADOR ({USER_EMAIL})...")
    try:
        permission = {
            'type': 'user',
            'role': 'writer',
            'emailAddress': USER_EMAIL
        }
        service.permissions().create(
            fileId=root_folder_id,
            body=permission,
            fields='id'
        ).execute()
        print(f"   [OK] Pasta '{root_folder['name']}' partilhada com {USER_EMAIL} (role: writer)")
    except HttpError as error:
        print(f"   [ERRO] Ao partilhar: {error}")
        print(f"   Nota: Verifique se a Service Account tem permissão para partilhar ficheiros.")

    print("\n" + "=" * 80)
    print("AUDITORIA CONCLUIDA")
    print("=" * 80)
    print(f"\nProximos passos:")
    print(f"1. Acesse a pasta raiz: {root_folder_link}")
    print(f"2. Adicione PDFs/livros em 01_BIBLIOTECA_FCIA/[Categoria]/")
    print(f"3. Configure a Edge Function sync-google-drive com folder_id: {root_folder_id}")

if __name__ == "__main__":
    main()