import type { Muscle } from '@gym/domain';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View,
  type ColorValue, type TextInputProps, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, MUSCLE_COLORS, MUSCLE_LABELS, radius, spacing } from '../theme';

/** Íconos de la app: Material Symbols en Android, SF Symbols en iOS (`expo-symbols`). */
const ICONS = {
  today: { android: 'today', ios: 'calendar' },
  plan: { android: 'event_note', ios: 'list.bullet.rectangle' },
  routines: { android: 'format_list_bulleted', ios: 'list.bullet' },
  exercises: { android: 'fitness_center', ios: 'dumbbell' },
  more: { android: 'more_horiz', ios: 'ellipsis' },
  menu: { android: 'more_vert', ios: 'ellipsis' },
  check: { android: 'check', ios: 'checkmark' },
  add: { android: 'add', ios: 'plus' },
  close: { android: 'close', ios: 'xmark' },
  delete: { android: 'delete', ios: 'trash' },
} as const;
export type IconName = keyof typeof ICONS;

export function Icon({ name, color = colors.text, size = 22 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <SymbolView name={ICONS[name]} tintColor={color} size={size} />;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, disabled, variant = 'primary' }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** primary: acción principal. secondary: superficie gris. ghost: solo borde. */
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && { backgroundColor: colors.surface },
        variant === 'ghost' && styles.ghost,
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, variant !== 'primary' && { color: variant === 'ghost' ? colors.accent : colors.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: spacing.xs, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{title}</Text>
      {hint && <Text style={styles.muted}>{hint}</Text>}
      {children}
    </View>
  );
}

/** Encabezado de pantalla estilo "LUNES · INFERIOR": línea chica arriba y título grande en mayúsculas. */
export function ScreenHeader({ overline, title, right }: { overline?: string; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        {overline && <Text style={styles.label}>{overline}</Text>}
        <Text style={styles.heading}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Etiqueta de color del músculo (ej. GLÚTEOS). */
export function MuscleTag({ muscle }: { muscle: Muscle }) {
  const color = MUSCLE_COLORS[muscle];
  return (
    <View style={[styles.tag, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={[styles.tagText, { color }]}>{MUSCLE_LABELS[muscle]}</Text>
    </View>
  );
}

/** Pastilla informativa (rango de reps, anotación). */
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'accent' }) {
  const palette = {
    neutral: { bg: colors.surface, fg: colors.text },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    accent: { bg: colors.accentMuted, fg: colors.accent },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={{ color: palette.fg, fontSize: 12, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

function Chip({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: small ? spacing.sm : spacing.md,
        paddingVertical: small ? 5 : 8,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accent : colors.surface,
      }}>
      <Text style={{ color: active ? colors.onAccent : colors.text, fontSize: small ? 12 : 14, fontWeight: active ? '700' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Elegir una opción. Con `allowNone`, tocar la elegida la deselecciona. */
export function Chips<T extends string>({ options, value, onChange, labels, small, allowNone }: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
  labels: Record<T, string>;
  small?: boolean;
  allowNone?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => (
        <Chip key={o} label={labels[o]} active={o === value} small={small} onPress={() => onChange(allowNone && o === value ? null : o)} />
      ))}
    </View>
  );
}

/** Elegir varias opciones. */
export function MultiChips<T extends string>({ options, value, onChange, labels }: {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  labels: Record<T, string>;
}) {
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => (
        <Chip key={o} label={labels[o]} active={value.includes(o)} onPress={() => toggle(o)} />
      ))}
    </View>
  );
}

/**
 * Opciones grandes en grilla, para responder con un toque (feedback de la serie, dolor…).
 * Elegida: acento sólido. Sin elegir: acento apagado.
 */
export function OptionGrid<T extends string | number>({ options, value, onChange, label, sublabel, columns = 4 }: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  label: (o: T) => string;
  sublabel?: (o: T) => string;
  columns?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => {
        const active = o === value;
        return (
          <Pressable
            key={String(o)}
            onPress={() => onChange(o)}
            style={({ pressed }) => [
              styles.option,
              { width: `${100 / columns - 3}%`, backgroundColor: active ? colors.accent : colors.accentMuted },
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={{ color: active ? colors.onAccent : colors.text, fontWeight: '700', textAlign: 'center' }}>{label(o)}</Text>
            {sublabel && (
              <Text style={{ color: active ? colors.onAccent : colors.muted, fontSize: 11, textAlign: 'center' }}>{sublabel(o)}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Hoja que sube desde abajo, sobre un fondo oscurecido. Tocar afuera la cierra. */
export function Sheet({ visible, onClose, title, subtitle, children }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.sheetHandle} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Icon name="close" color={colors.muted} />
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}

/** Número entero con − y +. */
export function Stepper({ value, onChange, min = 0, max = 40 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const button = (label: string, next: number) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={next < min || next > max}
      style={({ pressed }) => [styles.stepperButton, (pressed || next < min || next > max) && { opacity: 0.4 }]}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {button('−', value - 1)}
      <Text style={[styles.text, { minWidth: 28, textAlign: 'center', fontWeight: '700' }]}>{value}</Text>
      {button('+', value + 1)}
    </View>
  );
}

/** Barra de progreso de series hechas contra el objetivo. */
export function ProgressBar({ done, target, color }: { done: number; target: number; color?: string }) {
  const ratio = target > 0 ? Math.min(1, done / target) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' }}>
      <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: done >= target ? colors.success : (color ?? colors.accent) }} />
    </View>
  );
}

/** Estado de carga o error de una query. Devuelve null si hay datos. */
export function QueryState({ isLoading, error, onRetry }: { isLoading: boolean; error: Error | null; onRetry: () => void }) {
  if (isLoading) return <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />;
  if (!error) return null;
  return (
    <Card style={{ margin: spacing.lg, gap: spacing.md }}>
      <Text style={{ color: colors.danger }}>No pude conectar con la API: {error.message}</Text>
      <Button title="Reintentar" onPress={onRetry} />
    </Card>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  heading: { color: colors.text, fontSize: 24, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  text: { color: colors.text, fontSize: 15 },
  muted: { color: colors.muted, fontSize: 13 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: colors.surface, color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16,
  },
  button: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  buttonText: { color: colors.onAccent, fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.6 },
  stepperButton: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, alignSelf: 'flex-start' },
  option: { borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, gap: 2, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.xs },
});
