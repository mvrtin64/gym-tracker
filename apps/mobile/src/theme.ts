import type {
  ComparisonStatus, DayKind, ExerciseType, Feel, Focus, Level, Muscle, ProgressionDecision, Weekday,
} from '@gym/domain';

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

export const MUSCLE_LABELS: Record<Muscle, string> = {
  front_delt: 'Deltoides anterior',
  side_delt: 'Deltoides lateral',
  rear_delt: 'Deltoides posterior',
  chest: 'Pecho',
  upper_back: 'Espalda alta',
  lats: 'Dorsales',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  abs: 'Abdominales',
  quads: 'Cuádriceps',
  hamstrings: 'Isquios',
  glutes: 'Glúteos',
  calves: 'Gemelos',
};

export const TYPE_LABELS: Record<ExerciseType, string> = {
  compound: 'Multiarticular',
  isolation: 'Monoarticular',
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export const FOCUS_LABELS: Record<Focus, string> = {
  general: 'General / completo',
  lower: 'Tren inferior y glúteos',
  upper: 'Tren superior',
  specific: 'Músculos específicos',
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom',
};

export const WEEKDAY_LONG: Record<Weekday, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
};

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  upper: 'Tren superior',
  lower: 'Tren inferior',
  full: 'Cuerpo completo',
};

/** Escala de sensación del principiante (docs/dominio.md §6.2): corta para los chips, larga para explicarla. */
export const FEEL_LABELS: Record<Feel, { short: string; long: string }> = {
  failure: { short: 'Al fallo', long: 'No podía hacer ni una más' },
  one_two_left: { short: '1-2 más', long: 'Me quedaban 1 o 2' },
  several_left: { short: 'Varias más', long: 'Me quedaban varias' },
  very_easy: { short: 'Muy fácil', long: 'Muy fácil, me sobraba mucho' },
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
