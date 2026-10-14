// Tipos para Certificates — Fase 4 (LMS & Certificados)
// Alinhado com migration 20261014000004_create_assessments_and_certificates.sql

export interface Certificate {
  id: string;
  enrollment_id: string;
  user_id: string;
  course_id: string;
  organization_id: string;
  verification_code: string;
  issued_at: string;
  expires_at: string | null;
  final_score: number;
  completion_date: string; // ISO date string YYYY-MM-DD
  metadata: CertificateMetadata;
  created_at: string;
  updated_at: string;
}

export interface CertificateMetadata {
  course_title?: string;
  student_name?: string;
  organization_name?: string;
  total_hours?: number;
  modules_completed?: number;
  instructor_name?: string;
  [key: string]: unknown;
}

export interface CertificateIssueInput {
  enrollment_id: string;
  course_id: string;
  organization_id: string;
  final_score: number;
  completion_date: string;
  metadata?: CertificateMetadata;
  expires_at?: string | null;
}

export interface CertificateVerificationResult {
  valid: boolean;
  certificate: Certificate | null;
  error?: string;
}