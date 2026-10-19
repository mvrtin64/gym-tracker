import {
  FOCUSES, LEVELS, MAX_TRAINING_DAYS, MUSCLES, muscleRecord, WEEKDAYS, type Focus, type Level, type Muscle, type Weekday,
} from '@gym/domain';
import { router, Stack } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile, useSaveProfile } from '../api/hooks';
import type { ProfileInput } from '../api/types';
import {
  Button, Card, Field, MultiChips, OptionGrid, ProgressBar, QueryState, ScreenHeader, Stepper, styles,
} from '../components/ui';
import { colors, FOCUS_LABELS, LEVEL_LABELS, MUSCLE_COLORS, MUSCLE_LABELS, spacing, WEEKDAY_LABELS } from '../theme';

/** Valor de arranque de cada músculo en el formulario; el usuario lo ajusta a lo que hace hoy. */
const STARTING_REPORTED_SETS = 8;

const LEVEL_HINTS: Record<Level, string> = {
  beginner: 'Más series por semana para aprender técnica y a acercarte al fallo. Entrenás todo por igual.',
  intermediate: 'La app parte de cómo ya entrenás y te acompaña desde ahí.',
  advanced: 'La app parte de cómo ya entrenás y te acompaña desde ahí.',
};

type StepId = 'level' | 'days' | 'focus' | 'reps' | 'volume';
const STEP_TEXT: Record<StepId, { title: string; hint: string }> = {
  level: { title: 'Tu nivel', hint: 'Define con cuánto volumen arrancás y cómo anotás el esfuerzo de cada serie.' },
  days: { title: 'Qué días entrenás', hint: `Hasta ${MAX_TRAINING_DAYS}. Un mismo músculo no se repite en días seguidos.` },
  focus: { title: 'Tu enfoque', hint: 'Los músculos priorizados van hasta 3 veces por semana si tus días lo permiten.' },
  reps: { title: 'Repeticiones', hint: 'Opcional: el rango con el que te sentís cómodo.' },
  volume: { title: 'Tu volumen actual', hint: 'Series efectivas por semana de cada músculo, sin calentamientos ni trabajo indirecto.' },
};

const byWeekOrder = (days: Weekday[]) => [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));

/**
 * Onboarding (docs/dominio.md §2). La primera vez es un paso a paso; para editar el perfil, todo en
 * una pantalla.
 */
export default function OnboardingScreen() {
  const profile = useProfile();
  const save = useSaveProfile();
  // El volumen se pregunta solo la primera vez: después se ajusta desde la semana, no desde el perfil.
  const firstTime = profile.data === null;

  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState<Weekday[]>([]);
  const [focus, setFocus] = useState<Focus>('general');
  const [priority, setPriority] = useState<Muscle[]>([]);
  const [repMin, setRepMin] = useState('');
  const [repMax, setRepMax] = useState('');
  const [volume, setVolume] = useState(() => muscleRecord(STARTING_REPORTED_SETS));
  const [step, setStep] = useState(0);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setLevel(p.level);
    setDays(p.trainingDays);
    setFocus(p.focus);
    setPriority(p.priorityMuscles);
    setRepMin(p.preferredRepMin?.toString() ?? '');
    setRepMax(p.preferredRepMax?.toString() ?? '');
  }, [profile.data]);

  const experienced = level === 'intermediate' || level === 'advanced';
  const steps: StepId[] = [
    'level',
    'days',
    ...(experienced ? (['focus', 'reps'] as const) : []),
    ...(experienced && firstTime ? (['volume'] as const) : []),
  ];

  const changeDays = (next: Weekday[]) => {
    if (next.length > MAX_TRAINING_DAYS) {
      Alert.alert(`Máximo ${MAX_TRAINING_DAYS} días`, 'Dejá al menos un día de descanso en la semana.');
      return;
    }
    setDays(next);
  };

  /** Valida un paso: devuelve el título y el mensaje del problema, o null. */
  const problem = (id: StepId): [string, string] | null => {
    if (id === 'level' && !level) return ['Falta tu nivel', 'Elegí el que más se parezca a cómo entrenás hoy.'];
    if (id === 'days' && days.length === 0) return ['Faltan los días', 'Elegí al menos un día de entrenamiento.'];
    if (id === 'focus' && focus === 'specific' && priority.length === 0) {
      return ['Faltan músculos', 'Con enfoque en músculos específicos, elegí cuáles querés priorizar.'];
    }
    if (id === 'reps') {
      const hasRange = repMin.trim() !== '' || repMax.trim() !== '';
      const min = Number(repMin);
      const max = Number(repMax);
      if (hasRange && !(Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min)) {
        return ['Revisá el rango', 'Poné mínimo y máximo de repeticiones (ej. 6 y 10), o dejá los dos vacíos.'];
      }
    }
    return null;
  };

  const submit = () => {
    const failed = steps.map(problem).find((p) => p !== null);
    if (failed) return Alert.alert(...failed);
    const body: ProfileInput = { level: level!, trainingDays: byWeekOrder(days) };
    if (experienced) {
      const hasRange = repMin.trim() !== '' || repMax.trim() !== '';
      Object.assign(body, {
        focus,
        priorityMuscles: priority,
        ...(hasRange && { preferredRepMin: Number(repMin), preferredRepMax: Number(repMax) }),
        ...(firstTime && { reportedVolume: MUSCLES.map((muscle) => ({ muscle, weeklySets: volume[muscle] })) }),
      });
    }
    save.mutate(body, { onSuccess: () => router.replace('/'), onError: (e) => Alert.alert('No se guardó', e.message) });
  };

  if (profile.isLoading || profile.error) {
    return (
      <View style={styles.screen}>
        <QueryState isLoading={profile.isLoading} error={profile.error} onRetry={profile.refetch} />
      </View>
    );
  }

  const body = (id: StepId): ReactNode => {
    switch (id) {
      case 'level':
        return (
          <OptionGrid
            options={LEVELS}
            value={level}
            columns={1}
            label={(l) => LEVEL_LABELS[l]}
            sublabel={(l) => LEVEL_HINTS[l]}
            onChange={setLevel}
          />
        );
      case 'days':
        return <DayPicker value={days} onChange={changeDays} />;
      case 'focus':
        return (
          <View style={{ gap: spacing.lg }}>
            <OptionGrid options={FOCUSES} value={focus} columns={2} label={(f) => FOCUS_LABELS[f]} onChange={setFocus} />
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Músculos a priorizar{focus === 'specific' ? '' : ' (opcional)'}</Text>
              <MultiChips options={MUSCLES} value={priority} onChange={setPriority} labels={MUSCLE_LABELS} />
            </View>
          </View>
        );
      case 'reps':
        return (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Field label="Mínimo" keyboardType="number-pad" value={repMin} onChangeText={setRepMin} placeholder="6" />
            <Field label="Máximo" keyboardType="number-pad" value={repMax} onChangeText={setRepMax} placeholder="10" />
          </View>
        );
      case 'volume':
        return (
          <Card style={{ gap: spacing.sm }}>
            {MUSCLES.map((m) => (
              <View key={m} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MUSCLE_COLORS[m] }} />
                  <Text style={styles.text}>{MUSCLE_LABELS[m]}</Text>
                </View>
                <Stepper value={volume[m]} onChange={(v) => setVolume((cur) => ({ ...cur, [m]: v }))} />
              </View>
            ))}
          </Card>
        );
    }
  };

  // Editar el perfil: todos los pasos en una pantalla.
  if (!firstTime) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        {steps.map((id) => (
          <Card key={id} style={{ gap: spacing.md }}>
            <View style={{ gap: 2 }}>
              <Text style={styles.title}>{STEP_TEXT[id].title}</Text>
              <Text style={styles.muted}>{STEP_TEXT[id].hint}</Text>
            </View>
            {body(id)}
          </Card>
        ))}
        <Button title={save.isPending ? 'Guardando…' : 'Guardar'} onPress={submit} disabled={save.isPending} />
      </ScrollView>
    );
  }

  // Primera vez: paso a paso.
  const index = Math.min(step, steps.length - 1);
  const current = steps[index];
  const last = index === steps.length - 1;
  const next = () => {
    const failed = problem(current);
    if (failed) return Alert.alert(...failed);
    if (last) submit();
    else setStep(index + 1);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Paso {index + 1} de {steps.length}</Text>
          <ProgressBar done={index + 1} target={steps.length} color={colors.accent} />
        </View>
        {index === 0 && (
          <Text style={styles.muted}>Unas preguntas para armar tu punto de partida. Después todo se ajusta según cómo rindas.</Text>
        )}
        <View style={{ gap: spacing.xs }}>
          <ScreenHeader title={STEP_TEXT[current].title} />
          <Text style={styles.muted}>{STEP_TEXT[current].hint}</Text>
        </View>
        {body(current)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
        {index > 0 && (
          <View style={{ flex: 1 }}>
            <Button title="Atrás" variant="ghost" onPress={() => setStep(index - 1)} />
          </View>
        )}
        <View style={{ flex: 2 }}>
          <Button title={save.isPending ? 'Guardando…' : last ? 'Empezar' : 'Siguiente'} onPress={next} disabled={save.isPending} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Días de la semana como botones redondos, con la cuenta abajo. */
function DayPicker({ value, onChange }: { value: Weekday[]; onChange: (days: Weekday[]) => void }) {
  const toggle = (d: Weekday) => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {WEEKDAYS.map((d) => {
          const active = value.includes(d);
          return (
            <Pressable
              key={d}
              onPress={() => toggle(d)}
              style={({ pressed }) => ({
                flex: 1,
                aspectRatio: 1,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? colors.accent : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ color: active ? colors.onAccent : colors.text, fontWeight: '700', fontSize: 13 }}>{WEEKDAY_LABELS[d]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.muted}>
        {value.length === 0 ? 'Ningún día elegido.' : `${value.length} ${value.length === 1 ? 'día' : 'días'} por semana.`}
      </Text>
    </View>
  );
}
