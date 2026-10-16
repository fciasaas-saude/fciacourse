#!/usr/bin/env python3
"""Script para obter o ID da subpasta Lideranca no Google Drive."""
import os
from google.oauth2 import service_account
from googleapiclient.discovery import build

SERVICE_ACCOUNT_FILE = 'service-account-key.json'
PARENT_FOLDER_ID = '1TJjgqeAPDk9vkAjRAT3uK4EsVadTWaL2'  # 01_BIBLIOTECA_FCIA

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/drive']
)
service = build('drive', 'v3', credentials=credentials)

query = f"'{PARENT_FOLDER_ID}' in parents and name = 'Lideranca' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
results = service.files().list(q=query, fields="files(id, name)").execute()
files = results.get('files', [])

if files:
    print(files[0]['id'])
else:
    print("Nao encontrado")