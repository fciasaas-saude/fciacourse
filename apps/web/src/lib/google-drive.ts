// Google Drive API client for FCIA Course Engine
// Folder ID oficial dos 9 livros de referência
export const DEFAULT_BIBLIOTECAS_FOLDER_ID = '1uLKZ1Q2iyUFfHlJXbajv-SnQyx9HGtc1';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface ListFolderResult {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Lista arquivos PDF em uma pasta do Google Drive usando service account ou OAuth token.
 * Em produção, usar google-auth-library com credentials reais.
 * Esta implementação usa fetch direto à REST API v3.
 */
export async function listPdfFilesInFolder(
  folderId: string,
  accessToken: string,
  pageSize = 100
): Promise<ListFolderResult> {
  const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('fields', 'files(id,name,mimeType,webViewLink,size,createdTime,modifiedTime),nextPageToken');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return {
    files: (data.files ?? []) as DriveFile[],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Obtém metadados de um arquivo específico no Drive.
 */
export async function getDriveFileMetadata(
  fileId: string,
  accessToken: string
): Promise<DriveFile> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,size,createdTime,modifiedTime`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<DriveFile>;
}

/**
 * Baixa o conteúdo binário de um arquivo PDF do Drive.
 */
export async function downloadDriveFile(
  fileId: string,
  accessToken: string
): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Drive download error (${response.status}): ${errorBody}`);
  }

  return response.arrayBuffer();
}