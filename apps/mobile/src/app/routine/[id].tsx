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
import { Button, Card, Icon, MuscleTag, OptionGrid, Pill, QueryState, ScreenHeader, Sheet, styles } from '../../components/ui';
import { colors, COMPARISON_UI, DECISION_UI, FEEL_LABELS, radius, spacing, WEEKDAY_LONG } from '../../theme';

interface Row {
  weight: string;
  reps: string;
  /** Feedback de la serie: sensación (principiante) o RPE (intermedio/avanzado). */
  feel: Feel | null;
  rpe: number | null;
  /** Marcada como hecha: solo estas se guardan. */
  done: boolean;
}
type WorkoutItem = WorkoutDto['exercises'][number];
interface Result {
  name: string;
  comparison: PerformanceComparison;
}
/** Qué hoja está abierta: el feedback de una serie o su menú. */
type SheetState = { exerciseId: string; index: number; kind: 'feedback' | 'menu' } | null;

/** RPE que se ofrecen; con el RIR al lado para que se entienda qué significa cada uno. */
const RPE_OPTIONS = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

const toNumber = (s: string) => Number(s.replace(',', '.'));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const emptyRow = (weight: string, reps: string): Row => ({ weight, reps, feel: null, rpe: null, done: false });
const rowsFrom = (t: NextTarget): Row[] => Array.from({ length: t.sets }, () => emptyRow(String(t.weightKg), String(t.reps)));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

const isValid = (r: Row) => {
  const w = toNumber(r.weight);
  const reps = toNumber(r.reps);
  return Number.isFinite(w) && w >= 0 && Number.isInteger(reps) && reps > 0;
};
const toSet = (r: Row): NewSet => ({
  weightKg: toNumber(r.weight),
  reps: toNumber(r.reps),
  feel: r.feel ?? undefined,
  rpe: r.rpe ?? undefined,
});
/** Las series marcadas como hechas y con datos válidos. */
const doneSets = (rows: Row[]): NewSet[] => rows.filter((r) => r.done && isValid(r)).map(toSet);

function feedbackLabel(r: Row): string | null {
  if (r.feel) return FEEL_LABELS[r.feel].short;
  if (r.rpe !== null) return `RPE ${r.rpe}`;
  return null;
}

/** Entrenamiento del día a partir de una rutina, comparando cada serie con la última vez. */
export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const profile = useProfile();
  const logSession = useLogSession();
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [sheet, setSheet] = useState<SheetState>(null);
  // Se congela al guardar: después la API ya devuelve la sesión de hoy como "última vez".
  const [results, setResults] = useState<{ items: Result[]; review: SessionReviewDto } | null>(null);
  const beginner = profile.data?.level === 'beginner';

  useEffect(() => {
    if (workout.data) {
      setRows(Object.fromEntries(workout.data.exercises.map((x) => [x.exercise.id, rowsFrom(x.target)])));
    }
  }, [workout.data]);

  const updateRow = (exerciseId: string, index: number, patch: Partial<Row>) =>
    setRows((all) => ({ ...all, [exerciseId]: all[exerciseId].map((r, i) => (i === index ? { ...r, ...patch } : r)) }));

  /** Marcar una serie la da por hecha y pide el feedback; desmarcarla la vuelve a dejar pendiente. */
  const toggleDone = (exerciseId: string, index: number) => {
    const row = rows[exerciseId][index];
    if (row.done) return updateRow(exerciseId, index, { done: false });
    if (!isValid(row)) return Alert.alert('Faltan datos', 'Cargá el peso y las repeticiones de la serie.');
    updateRow(exerciseId, index, { done: true });
    setSheet({ exerciseId, index, kind: 'feedback' });
  };

  const save = () => {
    if (!workout.data) return;
    const done = workout.data.exercises
      .map((x) => ({ item: x, sets: doneSets(rows[x.exercise.id] ?? []) }))
      .filter((x) => x.sets.length > 0);
    if (done.length === 0) {
      Alert.alert('Sin series', 'Marcá con ✓ las series que hiciste.');
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
  const sheetRow = sheet ? rows[sheet.exerciseId]?.[sheet.index] : undefined;
  const totalDone = Object.values(rows).reduce((sum, rs) => sum + rs.filter((r) => r.done).length, 0);
  const totalSets = Object.values(rows).reduce((sum, rs) => sum + rs.length, 0);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '' }} />
      <QueryState isLoading={workout.isLoading} error={workout.error} onRetry={workout.refetch} />
      {results ? (
        <Summary results={results.items} review={results.review} deloadWeek={deloadWeek} />
      ) : (
        data && (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
            <ScreenHeader
              overline={`${data.weekday ? WEEKDAY_LONG[data.weekday] : todayLabel()} · ${totalDone}/${totalSets} series`}
              title={data.name}
            />
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
                ? `Comparando con la última vez: ${shortDate(data.lastPerformedAt)}. `
                : 'Primera vez con esta rutina: hoy queda como referencia. '}
              Marcá cada serie con ✓ al terminarla.
            </Text>
            {data.exercises.map((x) => (
              <ExerciseBlock
                key={x.exercise.id}
                item={x}
                deloadWeek={deloadWeek}
                rows={rows[x.exercise.id] ?? []}
                onUpdate={(index, patch) => updateRow(x.exercise.id, index, patch)}
                onToggle={(index) => toggleDone(x.exercise.id, index)}
                onOpen={(index, kind) => setSheet({ exerciseId: x.exercise.id, index, kind })}
                onAdd={() =>
                  setRows((all) => {
                    const cur = all[x.exercise.id];
                    const last = cur[cur.length - 1];
                    return { ...all, [x.exercise.id]: [...cur, emptyRow(last?.weight ?? '0', last?.reps ?? '0')] };
                  })
                }
              />
            ))}
            <Button title={logSession.isPending ? 'Guardando…' : 'Terminar entrenamiento'} onPress={save} disabled={logSession.isPending} />
          </ScrollView>
        )
      )}

      <Sheet
        visible={sheet?.kind === 'feedback' && !!sheetRow}
        onClose={() => setSheet(null)}
        title={beginner ? '¿Cómo sentiste la serie?' : '¿Qué tan dura fue? (RPE)'}
        subtitle={beginner ? 'Con esto la app sabe cuánto te quedaba.' : '10 = no podías hacer ni una más.'}>
        {sheet && sheetRow && (beginner ? (
          <OptionGrid
            options={FEELS}
            value={sheetRow.feel}
            columns={2}
            label={(f) => FEEL_LABELS[f].short}
            sublabel={(f) => FEEL_LABELS[f].long}
            onChange={(feel) => { updateRow(sheet.exerciseId, sheet.index, { feel }); setSheet(null); }}
          />
        ) : (
          <OptionGrid
            options={RPE_OPTIONS}
            value={sheetRow.rpe}
            label={(rpe) => String(rpe)}
            sublabel={(rpe) => (rpe === 10 ? 'al fallo' : `quedaban ${10 - rpe}`)}
            onChange={(rpe) => { updateRow(sheet.exerciseId, sheet.index, { rpe }); setSheet(null); }}
          />
        ))}
      </Sheet>

      <Sheet visible={sheet?.kind === 'menu'} onClose={() => setSheet(null)} title={`Serie ${(sheet?.index ?? 0) + 1}`}>
        {sheet && (
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Agregar serie abajo"
              variant="secondary"
              onPress={() => {
                setRows((all) => {
                  const cur = all[sheet.exerciseId];
                  const base = cur[sheet.index];
                  const next = [...cur];
                  next.splice(sheet.index + 1, 0, emptyRow(base.weight, base.reps));
                  return { ...all, [sheet.exerciseId]: next };
                });
                setSheet(null);
              }}
            />
            <Button
              title="Borrar serie"
              variant="ghost"
              onPress={() => {
                setRows((all) => ({ ...all, [sheet.exerciseId]: all[sheet.exerciseId].filter((_, i) => i !== sheet.index) }));
                setSheet(null);
              }}
            />
          </View>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function ExerciseBlock({ item, deloadWeek, rows, onUpdate, onToggle, onOpen, onAdd }: {
  item: WorkoutItem;
  deloadWeek: boolean;
  rows: Row[];
  onUpdate: (index: number, patch: Partial<Row>) => void;
  onToggle: (index: number) => void;
  onOpen: (index: number, kind: 'feedback' | 'menu') => void;
  onAdd: () => void;
}) {
  const { exercise, targetMuscle, prescription, note, target, previous } = item;
  const prevSets = previous ? workingSets(previous.sets) : [];
  const done = doneSets(rows);
  const live = comparePerformance(done, previous?.sets ?? null);
  const decision = DECISION_UI[target.decision];

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <MuscleTag muscle={targetMuscle} />
          {exercise.demoUrl && (
            <Pressable onPress={() => Linking.openURL(exercise.demoUrl!).catch(() => Alert.alert('No se pudo abrir la demostración'))}>
              <Text style={{ color: colors.accent, fontWeight: '600' }}>▶ Demo</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.title}>{exercise.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <Pill tone="warning">{prescription.repMin}–{prescription.repMax} reps</Pill>
          {note && <Pill tone="accent">📝 {note}</Pill>}
        </View>
        {exercise.coachTip && <Text style={[styles.muted, { color: colors.accent }]}>💡 {exercise.coachTip}</Text>}
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ color: decision.color, fontWeight: '700' }}>
          {decision.label}: {target.sets}×{target.reps} @ {target.weightKg} kg
        </Text>
        <Text style={styles.muted}>{target.reason}</Text>
      </View>

      <View>
        <View style={[setRow, { paddingBottom: spacing.xs }]}>
          <View style={{ width: 28 }} />
          <Text style={[styles.label, { width: 64 }]}>
            {previous ? (previous.fromRoutine ? 'Última' : shortDate(previous.performedAt)) : 'Antes'}
          </Text>
          <Text style={[styles.label, { flex: 1, textAlign: 'center' }]}>Kg</Text>
          <Text style={[styles.label, { flex: 1, textAlign: 'center' }]}>Reps</Text>
          <Text style={[styles.label, { width: 40, textAlign: 'center' }]}>Log</Text>
        </View>
        {rows.map((r, i) => (
          <SetRowView
            key={i}
            row={r}
            previous={prevSets[i] ?? null}
            deloadWeek={deloadWeek}
            onChange={(patch) => onUpdate(i, patch)}
            onToggle={() => onToggle(i)}
            onMenu={() => onOpen(i, 'menu')}
            onFeedback={() => onOpen(i, 'feedback')}
          />
        ))}
        <Pressable onPress={onAdd} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm }}>
          <Icon name="add" color={colors.accent} size={18} />
          <Text style={{ color: colors.accent, fontWeight: '600' }}>Agregar serie</Text>
        </Pressable>
      </View>

      {!deloadWeek && done.length > 0 && <StatusLine comparison={live} />}
    </Card>
  );
}

const setRow = { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } as const;

function SetRowView({ row, previous, deloadWeek, onChange, onToggle, onMenu, onFeedback }: {
  row: Row;
  previous: SetLog | null;
  deloadWeek: boolean;
  onChange: (patch: Partial<Row>) => void;
  onToggle: () => void;
  onMenu: () => void;
  onFeedback: () => void;
}) {
  const set: SetLog = { weightKg: toNumber(row.weight), reps: toNumber(row.reps) };
  const rir = rirFromFeedback({ feel: row.feel ?? undefined, rpe: row.rpe ?? undefined });
  const cue = rir !== null && !deloadWeek ? effortCue(rir) : null;
  const feedback = feedbackLabel(row);
  const inputStyle = [styles.input, { flex: 1, textAlign: 'center' as const, paddingVertical: 8 }, row.done && { borderColor: colors.success }];

  return (
    <View style={{ paddingVertical: spacing.xs, gap: 2 }}>
      <View style={setRow}>
        <Pressable onPress={onMenu} hitSlop={8} style={{ width: 28, alignItems: 'center' }}>
          <Icon name="menu" color={colors.muted} size={20} />
        </Pressable>
        <Text style={[styles.muted, { width: 64 }]}>{previous ? `${previous.weightKg}×${previous.reps}` : '—'}</Text>
        <TextInput
          style={inputStyle}
          keyboardType="decimal-pad"
          selectTextOnFocus
          value={row.weight}
          onChangeText={(weight) => onChange({ weight })}
        />
        <TextInput
          style={inputStyle}
          keyboardType="number-pad"
          selectTextOnFocus
          value={row.reps}
          onChangeText={(reps) => onChange({ reps })}
        />
        <Pressable
          onPress={onToggle}
          hitSlop={6}
          style={{
            width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
            backgroundColor: row.done ? colors.success : colors.surface,
            borderWidth: 1, borderColor: row.done ? colors.success : colors.border,
          }}>
          {row.done && <Icon name="check" color={colors.onAccent} size={22} />}
        </Pressable>
      </View>
      {row.done && (
        <Pressable onPress={onFeedback} style={{ flexDirection: 'row', gap: spacing.sm, paddingLeft: 36 + 64 }}>
          <Text style={{ color: feedback ? colors.text : colors.accent, fontSize: 12, fontWeight: '600' }}>
            {feedback ?? 'Agregar cómo te quedó'}
          </Text>
          {!deloadWeek && <SetDelta current={set} previous={previous} />}
        </Pressable>
      )}
      {row.done && cue && <Text style={{ color: colors.warning, fontSize: 12, paddingLeft: 36 + 64 }}>{cue}</Text>}
    </View>
  );
}

function SetDelta({ current, previous }: { current: SetLog; previous: SetLog | null }) {
  const c = compareSet(current, previous);
  if (c.status === 'new') return null;
  const text = c.weightDeltaKg ? `${signed(c.weightDeltaKg)} kg` : c.repsDelta ? `${signed(c.repsDelta)} rep` : '=';
  return <Text style={{ color: COMPARISON_UI[c.status].color, fontWeight: '700', fontSize: 12 }}>{text}</Text>;
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
      <ScreenHeader overline="Listo" title="Entrenamiento guardado" />
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
