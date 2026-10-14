import type { ComparisonStatus, ExerciseType, MuscleGroup, ProgressionDecision } from '@gym/domain';

export const colors = {
  bg: '#111317',
  card: '#1b1e24',
  border: '#2a2e36',
  text: '#eceef2',
  muted: '#8b919c',
  accent: '#f97316',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas',
  shoulders: 'Hombros',
  arms: 'Brazos',
  core: 'Core',
  full_body: 'Cuerpo completo',
};

export const TYPE_LABELS: Record<ExerciseType, string> = {
  compound: 'Multiarticular',
  isolation: 'Monoarticular',
};

export const COMPARISON_UI: Record<ComparisonStatus, { label: string; color: string }> = {
  improved: { label: '↑ Progresaste', color: colors.success },
  same: { label: '= Igual', color: colors.warning },
  regressed: { label: '↓ Por debajo', color: colors.danger },
  new: { label: 'Primera vez', color: colors.muted },
};

export const DECISION_UI: Record<ProgressionDecision, { label: string; color: string }> = {
  start: { label: 'Primera sesión', color: colors.muted },
  increase_weight: { label: '↑ Subí el peso', color: colors.success },
  increase_reps: { label: '+1 rep', color: colors.accent },
  repeat: { label: 'Repetí', color: colors.warning },
  deload: { label: '↓ Descarga', color: colors.danger },
};
