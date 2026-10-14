import { comparePerformance, compareSet, workingSets, type NextTarget, type PerformanceComparison, type SetLog } from '@gym/domain';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLogSession, useWorkout } from '../../api/hooks';
import type { WorkoutDto } from '../../api/types';
import { Button, Card, QueryState, styles } from '../../components/ui';
import { colors, COMPARISON_UI, DECISION_UI, spacing, TYPE_LABELS } from '../../theme';

interface Row {
  weight: string;
  reps: string;
}
type WorkoutItem = WorkoutDto['exercises'][number];
interface Result {
  name: string;
  comparison: PerformanceComparison;
}

const toNumber = (s: string) => Number(s.replace(',', '.'));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const rowsFrom = (t: NextTarget): Row[] =>
  Array.from({ length: t.sets }, () => ({ weight: String(t.weightKg), reps: String(t.reps) }));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Las filas completas y válidas como series; las vacías o inválidas se ignoran. */
function parseRows(rows: Row[]): SetLog[] {
  return rows
    .map((r) => ({ weightKg: toNumber(r.weight), reps: toNumber(r.reps) }))
    .filter((s) => Number.isFinite(s.weightKg) && s.weightKg >= 0 && Number.isInteger(s.reps) && s.reps > 0);
}

/** Entrenamiento del día a partir de una rutina, comparando cada serie con la última vez. */
export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const logSession = useLogSession();
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  // Se congela al guardar: después la API ya devuelve la sesión de hoy como "última vez".
  const [results, setResults] = useState<Result[] | null>(null);

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
        onSuccess: () =>
          setResults(done.map((x) => ({
            name: x.item.exercise.name,
            comparison: comparePerformance(x.sets, x.item.previous?.sets ?? null),
          }))),
        onError: (e) => Alert.alert('No se guardó', e.message),
      },
    );
  };

  const data = workout.data;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: data?.name ?? '' }} />
      <QueryState isLoading={workout.isLoading} error={workout.error} onRetry={workout.refetch} />
      {results ? (
        <Summary results={results} />
      ) : (
        data && (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            <Text style={styles.muted}>
              {data.lastPerformedAt
                ? `Comparando con la última vez que hiciste ${data.name}: ${shortDate(data.lastPerformedAt)}.`
                : `Primera vez con ${data.name}: hoy queda como referencia para la próxima.`}
            </Text>
            {data.exercises.map((x) => (
              <ExerciseBlock
                key={x.exercise.id}
                item={x}
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

function ExerciseBlock({ item, rows, onChange }: { item: WorkoutItem; rows: Row[]; onChange: (rows: Row[]) => void }) {
  const { exercise, target, previous } = item;
  const prevSets = previous ? workingSets(previous.sets) : [];
  const current = parseRows(rows);
  const live = comparePerformance(current, previous?.sets ?? null);
  const decision = DECISION_UI[target.decision];
  const update = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text style={styles.title}>{exercise.name}</Text>
        <Text style={styles.muted}>{TYPE_LABELS[exercise.type]} · rango {exercise.repMin}-{exercise.repMax} reps</Text>
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
        const set = { weightKg: toNumber(r.weight), reps: toNumber(r.reps) };
        const valid = Number.isFinite(set.weightKg) && Number.isInteger(set.reps) && set.reps > 0;
        return (
          <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
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
            <View style={{ width: 64, alignItems: 'flex-end' }}>{valid && <SetDelta current={set} previous={prev} />}</View>
          </View>
        );
      })}

      <View style={{ flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' }}>
        <Pressable onPress={() => onChange([...rows, rows[rows.length - 1] ?? { weight: '0', reps: '0' }])}>
          <Text style={{ color: colors.accent }}>+ Serie</Text>
        </Pressable>
        {rows.length > 0 && (
          <Pressable onPress={() => onChange(rows.slice(0, -1))}>
            <Text style={{ color: colors.muted }}>− Serie</Text>
          </Pressable>
        )}
      </View>

      <StatusLine comparison={live} />
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

function Summary({ results }: { results: Result[] }) {
  const improved = results.filter((r) => r.comparison.status === 'improved').length;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>¡Entrenamiento guardado!</Text>
      <Text style={styles.muted}>Progresaste en {improved} de {results.length} ejercicios respecto de la última vez.</Text>
      {results.map((r) => (
        <Card key={r.name} style={{ gap: spacing.xs, borderColor: COMPARISON_UI[r.comparison.status].color }}>
          <Text style={styles.title}>{r.name}</Text>
          <StatusLine comparison={r.comparison} />
        </Card>
      ))}
      <Button title="Listo" onPress={() => router.back()} />
    </ScrollView>
  );
}
