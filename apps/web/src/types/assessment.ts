// Tipos para Assessment Layer — Fase 4 (LMS & Avaliação)
// Alinhado com migration 20261014000004_create_assessments_and_certificates.sql

export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended' | 'matching';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'suspended';
export type LessonProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface QuestionBank {
  id: string;
  organization_id: string;
  course_id: string | null;
  module_id: string | null;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  bank_id: string;
  question_type: QuestionType;
  content: string;
  options: string[];
  correct_answer: unknown;
  explanation: string | null;
  points: number;
  difficulty: QuestionDifficulty | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  organization_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  last_activity_at: string | null;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  status: LessonProgressStatus;
  score: number | null;
  completed_at: string | null;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAttempt {
  id: string;
  enrollment_id: string;
  course_id: string;
  module_id: string | null;
  attempt_number: number;
  total_questions: number;
  correct_answers: number;
  score: number;
  passed: boolean;
  answers: Record<string, unknown>;
  started_at: string;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSubmissionInput {
  enrollment_id: string;
  course_id: string;
  module_id?: string | null;
  answers: Record<string, unknown>;
}

export interface AssessmentResult {
  attempt_id: string;
  score: number;
  passed: boolean;
  total_questions: number;
  correct_answers: number;
  attempt_number: number;
}