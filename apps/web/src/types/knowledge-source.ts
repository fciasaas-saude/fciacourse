// Tipos para Knowledge Sources e Source Knowledge Cards — Fase 2
// Alinhado com migration 20261014000001_create_briefings_and_sources.sql

export type SourceType =
  | 'book'
  | 'article'
  | 'report'
  | 'video'
  | 'podcast'
  | 'internal_document'
  | 'legislation'
  | 'other';

export type RightsStatus =
  | 'public_domain'
  | 'creative_commons'
  | 'licensed'
  | 'fair_use'
  | 'proprietary'
  | 'pending_review';

export type ProcessingStatus =
  | 'pending'
  | 'extracting'
  | 'generating_cards'
  | 'completed'
  | 'failed'
  | 'needs_review';

export interface KnowledgeSource {
  id: string;
  organization_id: string;
  source_type: SourceType;
  title: string;
  author: string | null;
  publisher: string | null;
  publication_year: number | null;
  language: string;
  drive_file_id: string | null;
  drive_url: string | null;
  storage_path: string | null;
  rights_status: RightsStatus;
  permission_notes: string | null;
  classification: string | null;
  processing_status: ProcessingStatus;
  page_count: number | null;
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceKnowledgeCard {
  id: string;
  source_id: string;
  generated_by: string | null;
  model_name: string;
  thesis: string;
  teaching_goal: string;
  principles: Record<string, unknown>[];
  concepts: Record<string, unknown>[];
  method_summary: Record<string, unknown>;
  limitations: Record<string, unknown>[];
  fcia_direction: string | null;
  version: number;
  created_at: string;
}

export interface KnowledgeSourceInsert {
  organization_id: string;
  source_type: SourceType;
  title: string;
  author?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string;
  drive_file_id?: string | null;
  drive_url?: string | null;
  storage_path?: string | null;
  rights_status?: RightsStatus;
  permission_notes?: string | null;
  classification?: string | null;
  processing_status?: ProcessingStatus;
  page_count?: number | null;
  checksum?: string | null;
}

export interface KnowledgeSourceUpdate {
  source_type?: SourceType;
  title?: string;
  author?: string | null;
  publisher?: string | null;
  publication_year?: number | null;
  language?: string;
  drive_file_id?: string | null;
  drive_url?: string | null;
  storage_path?: string | null;
  rights_status?: RightsStatus;
  permission_notes?: string | null;
  classification?: string | null;
  processing_status?: ProcessingStatus;
  page_count?: number | null;
  checksum?: string | null;
}