import type {
  ComparisonStatus, DayKind, ExerciseType, Feel, Focus, Level, Muscle, ProgressionDecision, Weekday,
} from '@gym/domain';

/**
 * Paleta: grises oscuros (no negro puro) en capas —fondo, tarjeta, superficie elevada— y un único
 * acento. Opción elegida = acento sólido; no elegida = el mismo acento muy apagado.
 */
export const colors = {
  bg: '#16171b',
  card: '#1f2126',
  /** Inputs, encabezados de tabla, chips sin elegir. */
  surface: '#2a2d34',
  border: '#33363e',
  text: '#f2f3f5',
  muted: '#8e939d',
  accent: '#f97316',
  /** Acento apagado: fondo de opciones no elegidas y de pastillas. */
  accentMuted: '#3d2516',
  onAccent: '#ffffff',
  success: '#22c55e',
  successMuted: '#173a26',
  warning: '#eab308',
  warningMuted: '#3a3214',
  danger: '#ef4444',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 };

/** Color de la etiqueta de cada músculo, agrupados por familia (empuje, hombro, tirón, pierna). */
export const MUSCLE_COLORS: Record<Muscle, string> = {
  chest: '#ec4899',
  front_delt: '#f472b6',
  triceps: '#db2777',
  side_delt: '#a855f7',
  rear_delt: '#8b5cf6',
  upper_back: '#3b82f6',
  lats: '#0ea5e9',
  biceps: '#06b6d4',
  abs: '#94a3b8',
  quads: '#22c55e',
  hamstrings: '#84cc16',
  glutes: '#f59e0b',
  calves: '#eab308',
};

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
