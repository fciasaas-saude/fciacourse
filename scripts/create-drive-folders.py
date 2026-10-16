#!/usr/bin/env python3
"""
Script para criar a hierarquia de pastas do Google Drive para o FCIA Course Engine.
Usa a API do Google Drive com credentials de service account.
"""

import os
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Configurações
SCOPES = ['https://www.googleapis.com/auth/drive']
SERVICE_ACCOUNT_FILE = os.environ.get('GOOGLE_SERVICE_ACCOUNT_KEY_PATH', 'service-account-key.json')

def get_credentials():
    """Obtém credenciais da service account."""
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Erro: Arquivo de chave não encontrado em {SERVICE_ACCOUNT_FILE}")
        print("Defina a variável de ambiente GOOGLE_SERVICE_ACCOUNT_KEY_PATH ou coloque o arquivo na raiz do projeto.")
        sys.exit(1)

    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return credentials

def create_folder(service, folder_name, parent_id=None):
    """Cria uma pasta no Google Drive e retorna o ID."""
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    if parent_id:
        file_metadata['parents'] = [parent_id]

    try:
        folder = service.files().create(body=file_metadata, fields='id, name').execute()
        print(f"  Pasta criada: {folder['name']} (ID: {folder['id']})")
        return folder['id']
    except HttpError as error:
        print(f"  Erro ao criar pasta '{folder_name}': {error}")
        return None

def main():
    print("=" * 60)
    print("FCIA Course Engine - Criando Hierarquia de Pastas no Google Drive")
    print("=" * 60)

    credentials = get_credentials()
    service = build('drive', 'v3', credentials=credentials)

    # Pasta raiz
    root_folder_name = "FCIA_COURSE_ENGINE"
    print(f"\n1. Criando pasta raiz: {root_folder_name}")
    root_folder_id = create_folder(service, root_folder_name)

    if not root_folder_id:
        print("Erro crítico: Não foi possível criar a pasta raiz. Abortando.")
        sys.exit(1)

    # Estrutura de pastas
    folder_structure = {
        "01_BIBLIOTECA_FCIA": [
            "Inteligencia_Artificial",
            "Lideranca",
            "Marketing",
            "Vendas",
            "Atendimento",
            "Educacao",
            "Empreendedorismo",
            "Gestao_Publica",
            "Comunidades",
            "Politica_Etica"
        ],
        "02_MATERIAIS_CLIENTES": [],  # Subpastas serão criadas por cliente
        "03_CURSOS_EM_PRODUCAO": [],   # Subpastas serão criadas por curso
        "04_TEMPLATES_E_PADROES": [
            "Prompts",
            "Checklists",
            "Rubricas"
        ]
    }

    print("\n2. Criando subpastas principais...")
    for main_folder, subfolders in folder_structure.items():
        print(f"\n  Criando: {main_folder}")
        main_folder_id = create_folder(service, main_folder, root_folder_id)

        if main_folder_id and subfolders:
            for subfolder in subfolders:
                create_folder(service, subfolder, main_folder_id)

    print("\n" + "=" * 60)
    print("Hierarquia de pastas criada com sucesso!")
    print(f"Pasta raiz ID: {root_folder_id}")
    print("=" * 60)
    print("\nPróximos passos:")
    print("1. Adicione PDFs/livros em 01_BIBLIOTECA_FCIA/[Categoria]/")
    print("2. Configure a Edge Function sync-google-drive com o folder_id da raiz")
    print("3. Para clientes específicos, crie subpastas em 02_MATERIAIS_CLIENTES/")
    print("4. Para cursos, crie subpastas em 03_CURSOS_EM_PRODUCAO/")

if __name__ == "__main__":
    main()