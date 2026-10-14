// Tipos para Briefings e Course Projects — Fase 2
// Alinhado com migration 20261014000001_create_briefings_and_sources.sql

export type BriefingStatus = 'draft' | 'review' | 'approved' | 'archived';

export interface Briefing {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  problem_statement: string;
  target_audience: string;
  desired_outcome: string;
  audience_level: string | null;
  requested_format: string | null;
  estimated_duration: number | null; // minutos
  communication_tone: string | null;
  restrictions: string | null;
  status: BriefingStatus;
  created_at: string;
  updated_at: string;
}

export interface CourseProject {
  id: string;
  organization_id: string;
  briefing_id: string;
  project_name: string;
  vertical: string | null;
  stage: string;
  priority: number; // 1-5
  owner_id: string | null;
  budget_limit_cents: number | null;
  token_budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface BriefingInsert {
  organization_id: string;
  title: string;
  problem_statement: string;
  target_audience: string;
  desired_outcome: string;
  audience_level?: string | null;
  requested_format?: string | null;
  estimated_duration?: number | null;
  communication_tone?: string | null;
  restrictions?: string | null;
  status?: BriefingStatus;
}

export interface BriefingUpdate {
  title?: string;
  problem_statement?: string;
  target_audience?: string;
  desired_outcome?: string;
  audience_level?: string | null;
  requested_format?: string | null;
  estimated_duration?: number | null;
  communication_tone?: string | null;
  restrictions?: string | null;
  status?: BriefingStatus;
}

export interface CourseProjectInsert {
  organization_id: string;
  briefing_id: string;
  project_name: string;
  vertical?: string | null;
  stage?: string;
  priority?: number;
  owner_id?: string | null;
  budget_limit_cents?: number | null;
  token_budget?: number | null;
}

export interface CourseProjectUpdate {
  project_name?: string;
  vertical?: string | null;
  stage?: string;
  priority?: number;
  owner_id?: string | null;
  budget_limit_cents?: number | null;
  token_budget?: number | null;
}