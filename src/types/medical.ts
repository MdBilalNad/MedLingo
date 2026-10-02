export type FlagType =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical_low'
  | 'critical_high'
  | 'unknown';

export interface LabResult {
  test_name: string;
  raw_name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: FlagType;
  confidence: number;
}

export interface AnalysisRequest {
  report_text?: string;
  report_image_base64?: string;
  language: string; // e.g. "en", "hi", "es", "ar", "fr", "bn", "ur"
  age?: number | null;
  sex?: 'male' | 'female' | 'other' | null;
  include_audio?: boolean;
}

export interface AnalysisResponse {
  results: LabResult[];
  summary: string;
  explanations: Record<string, string>;
  questions_for_doctor: string[];
  urgent_notice: string | null;
  disclaimer: string;
  language: string;
  audio_url: string | null;
  warnings: string[];
  redacted_text_sample?: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  native_name: string;
  dir: 'ltr' | 'rtl';
  flag: string;
}

export interface SyntheticReport {
  id: string;
  title: string;
  category: string;
  patient_profile: {
    name: string;
    age: number;
    sex: 'male' | 'female' | 'other';
  };
  raw_text: string;
  has_critical: boolean;
  notes: string;
  expected_results: LabResult[];
}

export interface ConditionMatch {
  condition: string;
  matchPercentage: number;
  rationale: string;
  severity: 'low' | 'moderate' | 'high';
}

export interface ReportStrength {
  title: string;
  detail: string;
  relatedTest: string;
}

export interface ReportWeakness {
  title: string;
  detail: string;
  relatedTest: string;
  flag: FlagType;
}

export interface RoadmapStep {
  phase: string;
  timeframe: string;
  title: string;
  actions: string[];
}

export interface HealthLiteracyAssessment {
  score: number;
  rating: string;
  strengths: ReportStrength[];
  weaknesses: ReportWeakness[];
  conditionMatches: ConditionMatch[];
  roadmap: RoadmapStep[];
}

