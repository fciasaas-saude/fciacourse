// Tipos para Course Architectures — Fase 3
// Alinhado com migration 20261014000002_create_course_architectures.sql

export type ArchitectureStatus = 'draft' | 'review' | 'approved' | 'archived';

export interface LearningOutcome {
  id: string;
  description: string;
  bloom_level?: string; // remember, understand, apply, analyze, evaluate, create
  assessment_method?: string;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  learning_outcomes: string[]; // IDs dos learning_outcomes
  resources?: string[]; // IDs de knowledge_sources
  activities?: ModuleActivity[];
}

export interface ModuleActivity {
  type: 'video' | 'reading' | 'quiz' | 'exercise' | 'discussion' | 'project';
  title: string;
  description?: string;
  duration_minutes?: number;
}

export interface FinalAssessment {
  type: 'exam' | 'project' | 'portfolio' | 'presentation' | 'mixed';
  description: string;
  criteria: AssessmentCriterion[];
  passing_score?: number; // 0-100
}

export interface AssessmentCriterion {
  name: string;
  weight: number; // percentage
  description?: string;
}

export interface CourseArchitecture {
  id: string;
  course_project_id: string;
  version: number;
  title: string;
  subtitle: string | null;
  promise: string;
  target_audience: string;
  learning_outcomes: LearningOutcome[];
  course_format: string;
  estimated_duration_minutes: number | null;
  final_assessment: FinalAssessment;
  structure_json: Module[];
  status: ArchitectureStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface CourseArchitectureInsert {
  course_project_id: string;
  version?: number;
  title: string;
  subtitle?: string | null;
  promise: string;
  target_audience: string;
  learning_outcomes?: LearningOutcome[];
  course_format?: string;
  estimated_duration_minutes?: number | null;
  final_assessment?: FinalAssessment;
  structure_json?: Module[];
  status?: ArchitectureStatus;
}

export interface CourseArchitectureUpdate {
  title?: string;
  subtitle?: string | null;
  promise?: string;
  target_audience?: string;
  learning_outcomes?: LearningOutcome[];
  course_format?: string;
  estimated_duration_minutes?: number | null;
  final_assessment?: FinalAssessment;
  structure_json?: Module[];
  status?: ArchitectureStatus;
  approved_at?: string | null;
  approved_by?: string | null;
}