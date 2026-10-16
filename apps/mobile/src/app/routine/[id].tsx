import {
  comparePerformance, compareSet, effortCue, FEELS, rirFromFeedback, workingSets,
  type Feel, type NextTarget, type PerformanceComparison, type SetLog,
} from '@gym/domain';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLogSession, useProfile, useWorkout } from '../../api/hooks';
import type { NewSet, SessionReviewDto, WorkoutDto } from '../../api/types';
import { ReviewCard } from '../../components/adjustments';
import { Button, Card, Chips, QueryState, styles } from '../../components/ui';
import { colors, COMPARISON_UI, DECISION_UI, FEEL_LABELS, MUSCLE_LABELS, spacing } from '../../theme';

interface Row {
  weight: string;
  reps: string;
  /** Feedback de la serie: sensación (principiante) o RPE (intermedio/avanzado). */
  feel: Feel | null;
  rpe: string;
}
type WorkoutItem = WorkoutDto['exercises'][number];
interface Result {
  name: string;
  comparison: PerformanceComparison;
}

const FEEL_SHORT = Object.fromEntries(FEELS.map((f) => [f, FEEL_LABELS[f].short])) as Record<Feel, string>;

const toNumber = (s: string) => Number(s.replace(',', '.'));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const rowsFrom = (t: NextTarget): Row[] =>
  Array.from({ length: t.sets }, () => ({ weight: String(t.weightKg), reps: String(t.reps), feel: null, rpe: '' }));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function parseRpe(s: string): number | undefined {
  const n = toNumber(s);
  return s.trim() !== '' && n >= 1 && n <= 10 ? n : undefined;
}

/** Las filas completas y válidas como series; las vacías o inválidas se ignoran. */
function parseRows(rows: Row[]): NewSet[] {
  return rows
    .map((r) => ({ weightKg: toNumber(r.weight), reps: toNumber(r.reps), feel: r.feel ?? undefined, rpe: parseRpe(r.rpe) }))
    .filter((s) => Number.isFinite(s.weightKg) && s.weightKg >= 0 && Number.isInteger(s.reps) && s.reps > 0);
}

/** Entrenamiento del día a partir de una rutina, comparando cada serie con la última vez. */
export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const profile = useProfile();
  const logSession = useLogSession();
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  // Se congela al guardar: después la API ya devuelve la sesión de hoy como "última vez".
  const [results, setResults] = useState<{ items: Result[]; review: SessionReviewDto } | null>(null);
  const beginner = profile.data?.level === 'beginner';

  useEffect(() => {
    if (workout.data) {
      setRows(Object.fromEntries(workout.data.exercises.map((x) => [x.exercise.id, rowsFrom(x.target)])));
    }
  }, [workout.data]);

  const save = () => {
    if (!workout.data) return;
    const done = workout.data.exercises
      .map((x) => ({ item: x, sets: parseRows(rows[x.exercise.id] ?? []) }))
      .filter((x) => x.sets.length > 0);
    if (done.length === 0) {
      Alert.alert('Sin series', 'Cargá al menos una serie con peso y repeticiones.');
      return;
    }
    logSession.mutate(
      { routineId: id, entries: done.map((x) => ({ exerciseId: x.item.exercise.id, sets: x.sets })) },
      {
        onSuccess: (session) =>
          setResults({
            items: done.map((x) => ({
              name: x.item.exercise.name,
              comparison: comparePerformance(x.sets, x.item.previous?.sets ?? null),
            })),
            review: session.review,
          }),
        onError: (e) => Alert.alert('No se guardó', e.message),
      },
    );
  };

  const data = workout.data;
  // En la semana de descarga se entrena liviano a propósito: no se compara ni se pide apretar.
  const deloadWeek = data?.deload?.phase === 'deload';
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: data?.name ?? '' }} />
      <QueryState isLoading={workout.isLoading} error={workout.error} onRetry={workout.refetch} />
      {results ? (
        <Summary results={results.items} review={results.review} deloadWeek={deloadWeek} />
      ) : (
        data && (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            {data.deload && (
              <Card style={{ gap: spacing.xs, borderColor: colors.accent }}>
                <Text style={styles.title}>{deloadWeek ? 'Semana de descarga' : 'Volviendo de la descarga'}</Text>
                <Text style={styles.muted}>
                  {deloadWeek
                    ? `Mitad de series y de peso. Dejá ${data.deload.rir.min}–${data.deload.rir.max} reps en reserva: hoy no se busca progresar.`
                    : 'Las series todavía están reducidas: suben de a poco cada semana.'}
                </Text>
              </Card>
            )}
            <Text style={styles.muted}>
              {data.lastPerformedAt
                ? `Comparando con la última vez que hiciste ${data.name}: ${shortDate(data.lastPerformedAt)}.`
                : `Primera vez con ${data.name}: hoy queda como referencia para la próxima.`}
              {beginner
                ? ' Después de cada serie marcá cómo la sentiste.'
                : ' Anotá el RPE de cada serie (10 = no podías hacer otra).'}
            </Text>
            {data.exercises.map((x) => (
              <ExerciseBlock
                key={x.exercise.id}
                item={x}
                beginner={beginner}
                deloadWeek={deloadWeek}
                rows={rows[x.exercise.id] ?? []}
                onChange={(next) => setRows((r) => ({ ...r, [x.exercise.id]: next }))}
              />
            ))}
            <Button title={logSession.isPending ? 'Guardando…' : 'Terminar entrenamiento'} onPress={save} disabled={logSession.isPending} />
          </ScrollView>
        )
      )}
    </KeyboardAvoidingView>
  );
}

function ExerciseBlock({ item, beginner, deloadWeek, rows, onChange }: {
  item: WorkoutItem;
  beginner: boolean;
  deloadWeek: boolean;
  rows: Row[];
  onChange: (rows: Row[]) => void;
}) {
  const { exercise, targetMuscle, prescription, note, target, previous } = item;
  const prevSets = previous ? workingSets(previous.sets) : [];
  const live = comparePerformance(parseRows(rows), previous?.sets ?? null);
  const decision = DECISION_UI[target.decision];
  const update = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.muted}>{MUSCLE_LABELS[targetMuscle]} · rango {prescription.repMin}-{prescription.repMax} reps</Text>
        {note && <Text style={styles.text}>📝 {note}</Text>}
        {exercise.coachTip && <Text style={[styles.muted, { color: colors.accent }]}>💡 {exercise.coachTip}</Text>}
        {exercise.demoUrl && (
          <Pressable onPress={() => Linking.openURL(exercise.demoUrl!).catch(() => Alert.alert('No se pudo abrir la demostración'))}>
            <Text style={{ color: colors.accent }}>▶ Ver demostración</Text>
          </Pressable>
        )}
      </View>

      <View style={{ gap: 2 }}>
        <Text style={[styles.label, { color: decision.color }]}>
          Objetivo hoy · {decision.label}: {target.sets}×{target.reps} @ {target.weightKg} kg
        </Text>
        <Text style={styles.muted}>{target.reason}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Text style={[styles.label, { width: 18 }]}>#</Text>
        <Text style={[styles.label, { width: 72 }]}>
          {previous ? (previous.fromRoutine ? 'Última vez' : `Últ. (${shortDate(previous.performedAt)})`) : 'Anterior'}
        </Text>
        <Text style={[styles.label, { flex: 1 }]}>Kg</Text>
        <Text style={[styles.label, { flex: 1 }]}>Reps</Text>
        <Text style={[styles.label, { width: 64, textAlign: 'right' }]}>vs antes</Text>
      </View>
      {rows.map((r, i) => {
        const prev = prevSets[i] ?? null;
        const set: SetLog = { weightKg: toNumber(r.weight), reps: toNumber(r.reps) };
        const valid = Number.isFinite(set.weightKg) && Number.isInteger(set.reps) && set.reps > 0;
        const rir = rirFromFeedback({ feel: r.feel ?? undefined, rpe: parseRpe(r.rpe) });
        const cue = rir !== null && !deloadWeek ? effortCue(rir) : null;
        return (
          <View key={i} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Text style={[styles.muted, { width: 18 }]}>{i + 1}</Text>
              <Text style={[styles.text, { width: 72, color: colors.muted }]}>{prev ? `${prev.weightKg}×${prev.reps}` : '—'}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="decimal-pad"
                selectTextOnFocus
                value={r.weight}
                onChangeText={(v) => update(i, { weight: v })}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                keyboardType="number-pad"
                selectTextOnFocus
                value={r.reps}
                onChangeText={(v) => update(i, { reps: v })}
              />
              <View style={{ width: 64, alignItems: 'flex-end' }}>{valid && !deloadWeek && <SetDelta current={set} previous={prev} />}</View>
            </View>
            <View style={{ paddingLeft: 26 }}>
              {beginner ? (
                <Chips options={FEELS} value={r.feel} onChange={(feel) => update(i, { feel })} labels={FEEL_SHORT} small allowNone />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={styles.label}>RPE</Text>
                  <TextInput
                    style={[styles.input, { width: 64, paddingVertical: 6 }]}
                    keyboardType="decimal-pad"
                    placeholder="1-10"
                    placeholderTextColor={colors.muted}
                    value={r.rpe}
                    onChangeText={(v) => update(i, { rpe: v })}
                  />
                </View>
              )}
              {cue && <Text style={{ color: colors.warning, fontSize: 13, marginTop: 4 }}>{cue}</Text>}
            </View>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' }}>
        <Pressable onPress={() => onChange([...rows, { ...(rows[rows.length - 1] ?? { weight: '0', reps: '0' }), feel: null, rpe: '' }])}>
          <Text style={{ color: colors.accent }}>+ Serie</Text>
        </Pressable>
        {rows.length > 0 && (
          <Pressable onPress={() => onChange(rows.slice(0, -1))}>
            <Text style={{ color: colors.muted }}>− Serie</Text>
          </Pressable>
        )}
      </View>

      {!deloadWeek && <StatusLine comparison={live} />}
    </Card>
  );
}

function SetDelta({ current, previous }: { current: SetLog; previous: SetLog | null }) {
  const c = compareSet(current, previous);
  if (c.status === 'new') return <Text style={styles.muted}>nueva</Text>;
  const text = c.weightDeltaKg ? `${signed(c.weightDeltaKg)} kg` : c.repsDelta ? `${signed(c.repsDelta)} rep` : '=';
  return <Text style={{ color: COMPARISON_UI[c.status].color, fontWeight: '700' }}>{text}</Text>;
}

function StatusLine({ comparison }: { comparison: PerformanceComparison }) {
  const ui = COMPARISON_UI[comparison.status];
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 }}>
      <Text style={{ color: ui.color, fontWeight: '700' }}>{ui.label}</Text>
      <Text style={styles.muted}>
        {comparison.summary}
        {comparison.volumeDeltaKg ? `  Volumen ${signed(comparison.volumeDeltaKg)} kg.` : ''}
      </Text>
    </View>
  );
}

function Summary({ results, review, deloadWeek }: { results: Result[]; review: SessionReviewDto; deloadWeek: boolean }) {
  const improved = results.filter((r) => r.comparison.status === 'improved').length;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>¡Entrenamiento guardado!</Text>
      {deloadWeek ? (
        <Text style={styles.muted}>Sesión de descarga: no cuenta para comparar ni para ajustar el volumen.</Text>
      ) : (
        <Text style={styles.muted}>Progresaste en {improved} de {results.length} ejercicios respecto de la última vez.</Text>
      )}
      <ReviewCard review={review} />
      {!deloadWeek && results.map((r) => (
        <Card key={r.name} style={{ gap: spacing.xs, borderColor: COMPARISON_UI[r.comparison.status].color }}>
          <Text style={styles.title}>{r.name}</Text>
          <StatusLine comparison={r.comparison} />
        </Card>
      ))}
      <Button title="Listo" onPress={() => router.back()} />
    </ScrollView>
  );
}
