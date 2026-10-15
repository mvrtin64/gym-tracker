import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, disabled, variant = 'primary' }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.ghost,
        (pressed || disabled) && { opacity: 0.6 },
      ]}>
      <Text style={[styles.buttonText, variant === 'ghost' && { color: colors.accent }]}>{title}</Text>
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

function Chip({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: small ? spacing.sm : spacing.md,
        paddingVertical: small ? 5 : 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        backgroundColor: active ? colors.accent : 'transparent',
      }}>
      <Text style={{ color: colors.text, fontSize: small ? 12 : 14 }}>{label}</Text>
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
export function ProgressBar({ done, target }: { done: number; target: number }) {
  const ratio = target > 0 ? Math.min(1, done / target) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: done >= target ? colors.success : colors.accent }} />
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
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  text: { color: colors.text, fontSize: 15 },
  muted: { color: colors.muted, fontSize: 13 },
  label: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: 16,
  },
  button: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  stepperButton: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
