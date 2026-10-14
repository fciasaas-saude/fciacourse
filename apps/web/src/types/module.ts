// Tipos para Course Modules e Module Versions — Fase 3 (Module Factory)
// Alinhado com migration 20261014000003_create_modules_and_versions.sql

export type ModuleStatus = 'draft' | 'review' | 'approved' | 'archived';
export type ModuleVersionStatus = 'draft' | 'review' | 'approved' | 'rejected';

export interface TheoryBlock {
  type: 'theory';
  title: string;
  content: string; // markdown
  key_points?: string[];
}

export interface ExampleBlock {
  type: 'example';
  title: string;
  scenario: string;
  solution?: string;
  analysis?: string;
}

export interface ActivityBlock {
  type: 'activity';
  title: string;
  instructions: string;
  expected_output?: string;
  duration_minutes?: number;
}

export interface CommonMistakeBlock {
  type: 'common_mistake';
  title: string;
  mistake: string;
  correction: string;
  prevention_tip?: string;
}

export interface ChecklistBlock {
  type: 'checklist';
  title: string;
  items: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer_index: number;
  explanation?: string;
}

export interface QuizBlock {
  type: 'quiz';
  title: string;
  questions: QuizQuestion[];
  passing_score?: number; // 0-100
}

export type ContentBlock =
  | TheoryBlock
  | ExampleBlock
  | ActivityBlock
  | CommonMistakeBlock
  | ChecklistBlock
  | QuizBlock;

export interface ModuleContent {
  introduction?: string;
  blocks: ContentBlock[];
  summary?: string;
  additional_resources?: string[];
}

export interface GenerationMetadata {
  model_name?: string;
  prompt_version?: string;
  source_ids?: string[];
  architecture_id?: string;
  generated_at?: string;
  iterations?: number;
}

export interface CourseModule {
  id: string;
  course_id: string;
  module_number: number;
  title: string;
  description: string | null;
  learning_objective: string;
  status: ModuleStatus;
  estimated_duration_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleVersion {
  id: string;
  module_id: string;
  version: number;
  content_jsonb: ModuleContent;
  content_markdown: string | null;
  generation_metadata: GenerationMetadata;
  quality_score: number | null;
  originality_score: number | null;
  status: ModuleVersionStatus;
  created_by: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface CourseModuleInsert {
  course_id: string;
  module_number: number;
  title: string;
  description?: string | null;
  learning_objective: string;
  status?: ModuleStatus;
  estimated_duration_minutes?: number | null;
  sort_order?: number;
}

export interface CourseModuleUpdate {
  title?: string;
  description?: string | null;
  learning_objective?: string;
  status?: ModuleStatus;
  estimated_duration_minutes?: number | null;
  sort_order?: number;
}

export interface ModuleVersionInsert {
  module_id: string;
  version?: number;
  content_jsonb: ModuleContent;
  content_markdown?: string | null;
  generation_metadata?: GenerationMetadata;
  quality_score?: number | null;
  originality_score?: number | null;
  status?: ModuleVersionStatus;
}

export interface ModuleVersionUpdate {
  content_jsonb?: ModuleContent;
  content_markdown?: string | null;
  generation_metadata?: GenerationMetadata;
  quality_score?: number | null;
  originality_score?: number | null;
  status?: ModuleVersionStatus;
  approved_at?: string | null;
  approved_by?: string | null;
}