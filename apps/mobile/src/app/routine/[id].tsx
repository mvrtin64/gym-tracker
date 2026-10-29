import {
  comparePerformance, compareSet, effortCue, FEELS, JOINT_PAINS, MUSCLES, rirFromFeedback, SORENESS, workingSets,
  type Feel, type JointPain, type Muscle, type NextTarget, type PerformanceComparison, type SetLog, type Soreness,
} from '@gym/domain';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  useAddRoutineExercise, useAlternatives, useExercises, useLogSession, useProfile, useRemoveRoutineExercise,
  useReplaceExercise, useUpdateRoutineExercise, useWorkout,
} from '../../api/hooks';
import type { NewSet, SessionReviewDto, WorkoutDto } from '../../api/types';
import { JointPainCard, ReviewCard } from '../../components/adjustments';
import {
  Button, Card, Chips, Icon, MuscleTag, OptionGrid, Pill, QueryState, ScreenHeader, Sheet, Stepper, styles,
} from '../../components/ui';
import {
  colors, COMPARISON_UI, DECISION_UI, FEEL_LABELS, JOINT_PAIN_LABELS, MUSCLE_LABELS, radius, SORENESS_LABELS, spacing,
  WEEKDAY_LONG,
} from '../../theme';

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
/**
 * Qué hoja está abierta: el feedback de una serie, su menú, las preguntas al terminar un músculo,
 * editar un ejercicio de la rutina, cambiarlo o agregar uno.
 */
type SheetState =
  | { kind: 'feedback' | 'menu'; exerciseId: string; index: number }
  | { kind: 'muscle'; muscle: Muscle }
  | { kind: 'edit' | 'swap'; exerciseId: string }
  | { kind: 'add' }
  | null;

/** Lo que tarda en bajar una hoja antes de abrir la siguiente. */
const SHEET_SWAP_MS = 350;

/** RPE que se ofrecen; con el RIR al lado para que se entienda qué significa cada uno. */
const RPE_OPTIONS = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

const toNumber = (s: string) => Number(s.replace(',', '.'));
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const emptyRow = (weight: string, reps: string): Row => ({ weight, reps, feel: null, rpe: null, done: false });
const rowsFrom = (t: NextTarget): Row[] => Array.from({ length: t.sets }, () => emptyRow(String(t.weightKg), String(t.reps)));
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
const todayLabel = () => new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });

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
  // Feedback de dolor (§6.5): por ejercicio y por músculo, al terminar cada músculo.
  const [pains, setPains] = useState<Record<string, JointPain>>({});
  const [soreness, setSoreness] = useState<Partial<Record<Muscle, Soreness>>>({});
  const [asked, setAsked] = useState<Muscle[]>([]);
  const [pendingMuscle, setPendingMuscle] = useState<Muscle | null>(null);
  // Se congela al guardar: después la API ya devuelve la sesión de hoy como "última vez".
  const [results, setResults] = useState<{ items: Result[]; review: SessionReviewDto } | null>(null);
  const beginner = profile.data?.level === 'beginner';

  // Al cambiar o agregar un ejercicio la rutina se recarga: lo ya cargado de los demás se conserva
  // (ajuste durante el render, sin efecto).
  const [loaded, setLoaded] = useState<typeof workout.data>();
  if (workout.data && workout.data !== loaded) {
    const exercises = workout.data.exercises;
    setLoaded(workout.data);
    setRows((prev) => Object.fromEntries(exercises.map((x) => [x.exercise.id, prev[x.exercise.id] ?? rowsFrom(x.target)])));
  }

  const updateRow = (exerciseId: string, index: number, patch: Partial<Row>) =>
    setRows((all) => ({ ...all, [exerciseId]: all[exerciseId].map((r, i) => (i === index ? { ...r, ...patch } : r)) }));

  /** Marcar una serie la da por hecha y pide el feedback; desmarcarla la vuelve a dejar pendiente. */
  const toggleDone = (exerciseId: string, index: number) => {
    const row = rows[exerciseId][index];
    if (row.done) return updateRow(exerciseId, index, { done: false });
    if (!isValid(row)) return Alert.alert('Faltan datos', 'Cargá el peso y las repeticiones de la serie.');
    updateRow(exerciseId, index, { done: true });
    setSheet({ exerciseId, index, kind: 'feedback' });

    // Si con esta serie se terminó el músculo, después del feedback vienen sus preguntas.
    const exercises = workout.data?.exercises ?? [];
    const muscle = exercises.find((x) => x.exercise.id === exerciseId)?.targetMuscle;
    if (!muscle || asked.includes(muscle)) return;
    const finished = exercises
      .filter((x) => x.targetMuscle === muscle)
      .every((x) => (rows[x.exercise.id] ?? []).every((r, i) => r.done || (x.exercise.id === exerciseId && i === index)));
    if (finished) {
      setAsked((a) => [...a, muscle]);
      setPendingMuscle(muscle);
    }
  };

  /** Cierra el feedback de la serie y, si se terminó un músculo, abre sus preguntas. */
  const closeFeedback = () => {
    setSheet(null);
    if (!pendingMuscle) return;
    const muscle = pendingMuscle;
    setPendingMuscle(null);
    setTimeout(() => setSheet({ kind: 'muscle', muscle }), SHEET_SWAP_MS);
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
      {
        routineId: id,
        entries: done.map((x) => ({ exerciseId: x.item.exercise.id, jointPain: pains[x.item.exercise.id], sets: x.sets })),
        soreness: Object.entries(soreness).map(([muscle, s]) => ({ muscle: muscle as Muscle, soreness: s })),
      },
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
  const setSheetState = sheet?.kind === 'feedback' || sheet?.kind === 'menu' ? sheet : null;
  const sheetRow = setSheetState ? rows[setSheetState.exerciseId]?.[setSheetState.index] : undefined;
  const muscleSheet = sheet?.kind === 'muscle' ? sheet.muscle : null;
  const muscleItems = data?.exercises.filter((x) => x.targetMuscle === muscleSheet) ?? [];
  const totalDone = Object.values(rows).reduce((sum, rs) => sum + rs.filter((r) => r.done).length, 0);
  const totalSets = Object.values(rows).reduce((sum, rs) => sum + rs.length, 0);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '' }} />
      <QueryState isLoading={workout.isLoading} error={workout.error} onRetry={workout.refetch} />
      {results ? (
        <Summary results={results.items} review={results.review} deloadWeek={deloadWeek} routineId={id} />
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
                onEdit={() => setSheet({ kind: 'edit', exerciseId: x.exercise.id })}
                onAdd={() =>
                  setRows((all) => {
                    const cur = all[x.exercise.id];
                    const last = cur[cur.length - 1];
                    return { ...all, [x.exercise.id]: [...cur, emptyRow(last?.weight ?? '0', last?.reps ?? '0')] };
                  })
                }
              />
            ))}
            <Button title="Agregar ejercicio" variant="secondary" onPress={() => setSheet({ kind: 'add' })} />
            <Button title={logSession.isPending ? 'Guardando…' : 'Terminar entrenamiento'} onPress={save} disabled={logSession.isPending} />
          </ScrollView>
        )
      )}

      <Sheet
        visible={sheet?.kind === 'feedback' && !!sheetRow}
        onClose={closeFeedback}
        title={beginner ? '¿Cómo sentiste la serie?' : '¿Qué tan dura fue? (RPE)'}
        subtitle={beginner ? 'Con esto la app sabe cuánto te quedaba.' : '10 = no podías hacer ni una más.'}>
        {setSheetState && sheetRow && (beginner ? (
          <OptionGrid
            options={FEELS}
            value={sheetRow.feel}
            columns={2}
            label={(f) => FEEL_LABELS[f].short}
            sublabel={(f) => FEEL_LABELS[f].long}
            onChange={(feel) => { updateRow(setSheetState.exerciseId, setSheetState.index, { feel }); closeFeedback(); }}
          />
        ) : (
          <OptionGrid
            options={RPE_OPTIONS}
            value={sheetRow.rpe}
            label={(rpe) => String(rpe)}
            sublabel={(rpe) => (rpe === 10 ? 'al fallo' : `quedaban ${10 - rpe}`)}
            onChange={(rpe) => { updateRow(setSheetState.exerciseId, setSheetState.index, { rpe }); closeFeedback(); }}
          />
        ))}
      </Sheet>

      <Sheet
        visible={!!muscleSheet}
        onClose={() => setSheet(null)}
        title={muscleSheet ? `Terminaste ${MUSCLE_LABELS[muscleSheet].toLowerCase()}` : ''}
        subtitle="Con esto la app cuida tus articulaciones y ajusta el volumen.">
        {muscleSheet && (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>¿Te dolió alguna articulación?</Text>
              {muscleItems.map((x) => (
                <View key={x.exercise.id} style={{ gap: spacing.xs }}>
                  {muscleItems.length > 1 && <Text style={styles.text}>{x.exercise.name}</Text>}
                  <OptionGrid
                    options={JOINT_PAINS}
                    value={pains[x.exercise.id] ?? null}
                    label={(p) => JOINT_PAIN_LABELS[p]}
                    onChange={(p) => setPains((all) => ({ ...all, [x.exercise.id]: p }))}
                  />
                </View>
              ))}
            </View>
            {/* Agujetas: solo si hay una sesión anterior de la que recuperarse. */}
            {muscleItems.some((x) => x.previous) && (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.label}>¿Cómo llegaste desde la sesión anterior?</Text>
                <OptionGrid
                  options={SORENESS}
                  columns={2}
                  value={soreness[muscleSheet] ?? null}
                  label={(s) => SORENESS_LABELS[s]}
                  onChange={(s) => setSoreness((all) => ({ ...all, [muscleSheet]: s }))}
                />
              </View>
            )}
            <Button title="Listo" onPress={() => setSheet(null)} />
          </View>
        )}
      </Sheet>

      <EditSheet
        routineId={id}
        item={sheet?.kind === 'edit' ? data?.exercises.find((x) => x.exercise.id === sheet.exerciseId) ?? null : null}
        onSwap={(exerciseId) => {
          setSheet(null);
          setTimeout(() => setSheet({ kind: 'swap', exerciseId }), SHEET_SWAP_MS);
        }}
        // Las series de hoy se rearman con las nuevas de la rutina (lo ya cargado de los demás se conserva).
        onSetsSaved={(exerciseId) => setRows(({ [exerciseId]: _, ...rest }) => rest)}
        onClose={() => setSheet(null)}
      />
      <SwapSheet
        routineId={id}
        item={sheet?.kind === 'swap' ? data?.exercises.find((x) => x.exercise.id === sheet.exerciseId) ?? null : null}
        onClose={() => setSheet(null)}
      />
      <AddSheet
        routineId={id}
        visible={sheet?.kind === 'add'}
        inRoutine={data?.exercises.map((x) => x.exercise.id) ?? []}
        onClose={() => setSheet(null)}
      />

      <Sheet visible={sheet?.kind === 'menu'} onClose={() => setSheet(null)} title={`Serie ${(setSheetState?.index ?? 0) + 1}`}>
        {setSheetState && (
          <View style={{ gap: spacing.sm }}>
            <Button
              title="Agregar serie abajo"
              variant="secondary"
              onPress={() => {
                setRows((all) => {
                  const cur = all[setSheetState.exerciseId];
                  const base = cur[setSheetState.index];
                  const next = [...cur];
                  next.splice(setSheetState.index + 1, 0, emptyRow(base.weight, base.reps));
                  return { ...all, [setSheetState.exerciseId]: next };
                });
                setSheet(null);
              }}
            />
            <Button
              title="Borrar serie"
              variant="ghost"
              onPress={() => {
                const { exerciseId, index } = setSheetState;
                setRows((all) => ({ ...all, [exerciseId]: all[exerciseId].filter((_, i) => i !== index) }));
                setSheet(null);
              }}
            />
          </View>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** Ir a crear un ejercicio propio: para variantes que no están en el catálogo. */
const createOwn = (close: () => void) => {
  close();
  router.push('/new-exercise');
};

/**
 * Editar un ejercicio en la rutina: la app sugiere, pero el usuario la arma a su gusto. Los cambios
 * quedan para las próximas veces; agregar o borrar una serie desde la fila es solo para hoy.
 */
function EditSheet({ routineId, item, onSwap, onSetsSaved, onClose }: {
  routineId: string;
  item: WorkoutItem | null;
  onSwap: (exerciseId: string) => void;
  onSetsSaved: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const update = useUpdateRoutineExercise(routineId);
  const remove = useRemoveRoutineExercise(routineId);
  const [sets, setSets] = useState(item?.prescription.sets ?? 0);
  const [loaded, setLoaded] = useState(item);
  if (item && item !== loaded) {
    setLoaded(item);
    setSets(item.prescription.sets);
  }
  const busy = update.isPending || remove.isPending;

  const saveSets = () => {
    if (!item) return;
    if (sets === item.prescription.sets) return onClose();
    update.mutate(
      { exerciseId: item.exercise.id, sets },
      {
        onSuccess: () => { onSetsSaved(item.exercise.id); onClose(); },
        onError: (e) => Alert.alert('No se guardó', e.message),
      },
    );
  };
  const confirmRemove = () => {
    if (!item) return;
    Alert.alert(`¿Quitar ${item.exercise.name}?`, 'Sale de la rutina para las próximas veces.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () =>
          remove.mutate(item.exercise.id, { onSuccess: onClose, onError: (e) => Alert.alert('No se pudo quitar', e.message) }),
      },
    ]);
  };

  return (
    <Sheet visible={!!item} onClose={onClose} title={item?.exercise.name ?? ''} subtitle="Los cambios quedan guardados en la rutina.">
      {item && (
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.label}>Series por sesión</Text>
            <Stepper value={sets} onChange={setSets} min={1} max={10} />
          </View>
          <Button title={update.isPending ? 'Guardando…' : 'Guardar'} onPress={saveSets} disabled={busy} />
          <Button title="Cambiar por otro ejercicio" variant="secondary" onPress={() => onSwap(item.exercise.id)} disabled={busy} />
          <Button title="Quitar de la rutina" variant="ghost" onPress={confirmRemove} disabled={busy} />
        </View>
      )}
    </Sheet>
  );
}

/** Cambiar un ejercicio de la rutina por otro del mismo músculo, o por uno propio. */
function SwapSheet({ routineId, item, onClose }: { routineId: string; item: WorkoutItem | null; onClose: () => void }) {
  const alternatives = useAlternatives(routineId, item?.exercise.id ?? null);
  const replace = useReplaceExercise(routineId);
  const options = alternatives.data ?? [];

  const swap = (replacementId: string) => {
    if (!item || replace.isPending) return;
    replace.mutate(
      { exerciseId: item.exercise.id, replacementId },
      { onSuccess: onClose, onError: (e) => Alert.alert('No se pudo cambiar', e.message) },
    );
  };

  return (
    <Sheet
      visible={!!item}
      onClose={onClose}
      title={item ? `Cambiar ${item.exercise.name}` : ''}
      subtitle={item ? `Por otro de ${MUSCLE_LABELS[item.targetMuscle].toLowerCase()}. Queda cambiado en la rutina.` : undefined}>
      <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: spacing.md }}>
        {alternatives.isLoading && <Text style={styles.muted}>Buscando…</Text>}
        {!alternatives.isLoading && options.length === 0 && (
          <Text style={styles.muted}>No hay otro ejercicio de este músculo en el catálogo.</Text>
        )}
        {options.length > 0 && (
          <Chips
            options={options.map((o) => o.id)}
            labels={Object.fromEntries(options.map((o) => [o.id, o.name]))}
            value={null}
            onChange={(id) => id && swap(id)}
          />
        )}
        <Button title="Crear ejercicio propio" variant="ghost" onPress={() => createOwn(onClose)} />
      </ScrollView>
    </Sheet>
  );
}

/** Sumar un ejercicio a la rutina: primero el músculo, después el ejercicio. */
function AddSheet({ routineId, visible, inRoutine, onClose }: {
  routineId: string;
  visible: boolean;
  inRoutine: string[];
  onClose: () => void;
}) {
  const exercises = useExercises();
  const add = useAddRoutineExercise(routineId);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const options = (exercises.data ?? []).filter((e) => muscle && e.targetMuscles.includes(muscle) && !inRoutine.includes(e.id));

  const close = () => {
    setMuscle(null);
    onClose();
  };
  const pick = (exerciseId: string) => {
    if (!muscle || add.isPending) return;
    add.mutate(
      { exerciseId, targetMuscle: muscle },
      { onSuccess: close, onError: (e) => Alert.alert('No se pudo agregar', e.message) },
    );
  };

  return (
    <Sheet visible={visible} onClose={close} title="Agregar ejercicio" subtitle="Queda sumado a la rutina.">
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.md }}>
        <Text style={styles.label}>Músculo</Text>
        <Chips small options={MUSCLES} labels={MUSCLE_LABELS} value={muscle} onChange={setMuscle} />
        {muscle && (
          <>
            <Text style={styles.label}>Ejercicio</Text>
            {options.length === 0 ? (
              <Text style={styles.muted}>No queda ningún ejercicio de este músculo fuera de la rutina.</Text>
            ) : (
              <Chips
                options={options.map((o) => o.id)}
                labels={Object.fromEntries(options.map((o) => [o.id, o.name]))}
                value={null}
                onChange={(id) => id && pick(id)}
              />
            )}
          </>
        )}
        <Button title="Crear ejercicio propio" variant="ghost" onPress={() => createOwn(close)} />
      </ScrollView>
    </Sheet>
  );
}

function ExerciseBlock({ item, deloadWeek, rows, onUpdate, onToggle, onOpen, onAdd, onEdit }: {
  item: WorkoutItem;
  deloadWeek: boolean;
  rows: Row[];
  onUpdate: (index: number, patch: Partial<Row>) => void;
  onToggle: (index: number) => void;
  onOpen: (index: number, kind: 'feedback' | 'menu') => void;
  onAdd: () => void;
  onEdit: () => void;
}) {
  const { exercise, targetMuscle, prescription, note, target, previous, pain } = item;
  const prevSets = previous ? workingSets(previous.sets) : [];
  const done = doneSets(rows);
  const live = comparePerformance(done, previous?.sets ?? null);
  const decision = DECISION_UI[target.decision];

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <MuscleTag muscle={targetMuscle} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {exercise.demoUrl && (
              <Pressable onPress={() => Linking.openURL(exercise.demoUrl!).catch(() => Alert.alert('No se pudo abrir el video'))} hitSlop={8}>
                <Text style={{ color: colors.accent, fontWeight: '600' }}>▶ Técnica</Text>
              </Pressable>
            )}
            <Pressable onPress={onEdit} hitSlop={8}>
              <Text style={{ color: colors.accent, fontWeight: '600' }}>✎ Editar</Text>
            </Pressable>
          </View>
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
        {/* Con lower_weight el aviso ya va en el objetivo, que viene con el peso bajado. */}
        {pain && pain.kind !== 'lower_weight' && <Text style={{ color: colors.danger, fontSize: 13 }}>⚠️ {pain.reason}</Text>}
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

function Summary({ results, review, deloadWeek, routineId }: {
  results: Result[];
  review: SessionReviewDto;
  deloadWeek: boolean;
  routineId: string;
}) {
  const improved = results.filter((r) => r.comparison.status === 'improved').length;
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <ScreenHeader overline="Listo" title="Entrenamiento guardado" />
      {deloadWeek ? (
        <Text style={styles.muted}>Sesión de descarga: no cuenta para comparar ni para ajustar el volumen.</Text>
      ) : (
        <Text style={styles.muted}>Progresaste en {improved} de {results.length} ejercicios respecto de la última vez.</Text>
      )}
      <JointPainCard items={review.jointPain} routineId={routineId} />
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
