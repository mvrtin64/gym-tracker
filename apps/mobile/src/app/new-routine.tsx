import { SCHEME_PRESETS, WEEKDAYS, type Muscle, type Weekday } from '@gym/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useCreateRoutine, useExercises, useProfile } from '../api/hooks';
import type { ExerciseDto } from '../api/types';
import { Button, Card, Chips, Field, QueryState, Section, styles } from '../components/ui';
import { colors, MUSCLE_LABELS, spacing, WEEKDAY_LABELS } from '../theme';

/** Un ejercicio elegido, con su enfoque y prescripción (como texto mientras se edita). */
interface Item {
  exercise: ExerciseDto;
  targetMuscle: Muscle;
  sets: string;
  repMin: string;
  repMax: string;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isPositiveInt = (s: string) => /^\d+$/.test(s) && Number(s) >= 1;

export default function NewRoutineScreen() {
  const exercises = useExercises();
  const profile = useProfile();
  const create = useCreateRoutine();
  const [name, setName] = useState('');
  const [weekday, setWeekday] = useState<Weekday | null>(null);
  const [query, setQuery] = useState('');
  /** En el orden en que se agregaron (= orden de la rutina). */
  const [items, setItems] = useState<Item[]>([]);

  // Rango por defecto: el que eligió el usuario en el onboarding o, si no, el del tipo de ejercicio.
  const preferred = profile.data?.preferredRepMin && profile.data.preferredRepMax
    ? { min: profile.data.preferredRepMin, max: profile.data.preferredRepMax }
    : null;

  const add = (exercise: ExerciseDto) => {
    const preset = SCHEME_PRESETS[exercise.type];
    const range = preferred ?? preset.repRange;
    setItems((cur) => [
      ...cur,
      { exercise, targetMuscle: exercise.defaultTarget, sets: String(preset.sets), repMin: String(range.min), repMax: String(range.max) },
    ]);
    setQuery('');
  };
  const updateItem = (i: number, patch: Partial<Item>) => setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => setItems((cur) => cur.filter((_, j) => j !== i));

  const submit = () => {
    if (!name.trim() || items.length === 0) {
      Alert.alert('Faltan datos', 'Poné un nombre y agregá al menos un ejercicio.');
      return;
    }
    const invalid = items.find(
      (it) => ![it.sets, it.repMin, it.repMax].every(isPositiveInt) || Number(it.repMax) < Number(it.repMin),
    );
    if (invalid) {
      Alert.alert('Revisá la prescripción', `En "${invalid.exercise.name}" usá números enteros y un máximo mayor o igual al mínimo.`);
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        ...(weekday && { weekday }),
        exercises: items.map((it) => ({
          exerciseId: it.exercise.id,
          targetMuscle: it.targetMuscle,
          sets: Number(it.sets),
          repMin: Number(it.repMin),
          repMax: Number(it.repMax),
        })),
      },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('No se pudo crear', e.message) },
    );
  };

  const added = new Set(items.map((it) => it.exercise.id));
  const candidates = (exercises.data ?? []).filter((e) => !added.has(e.id) && normalize(e.name).includes(normalize(query)));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Inferior A, Torso, Empuje" />

      <Section title="Día (opcional)">
        <Chips options={WEEKDAYS} value={weekday} onChange={setWeekday} labels={WEEKDAY_LABELS} allowNone />
      </Section>

      <Section title="Ejercicios de la rutina" hint={items.length === 0 ? 'Agregalos desde la lista de abajo, en el orden en que los hacés.' : undefined}>
        {items.map((it, i) => (
          <Card key={it.exercise.id} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.text}>{i + 1}. {it.exercise.name}</Text>
              <Pressable onPress={() => remove(i)}>
                <Text style={{ color: colors.muted }}>Quitar</Text>
              </Pressable>
            </View>
            {it.exercise.targetMuscles.length > 1 && (
              <View style={{ gap: spacing.xs }}>
                <Text style={styles.label}>Cuenta para</Text>
                <Chips
                  options={it.exercise.targetMuscles}
                  value={it.targetMuscle}
                  onChange={(v) => v && updateItem(i, { targetMuscle: v })}
                  labels={MUSCLE_LABELS}
                  small
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Field label="Series" keyboardType="number-pad" value={it.sets} onChangeText={(v) => updateItem(i, { sets: v })} />
              <Field label="Reps mín" keyboardType="number-pad" value={it.repMin} onChangeText={(v) => updateItem(i, { repMin: v })} />
              <Field label="Reps máx" keyboardType="number-pad" value={it.repMax} onChangeText={(v) => updateItem(i, { repMax: v })} />
            </View>
          </Card>
        ))}
      </Section>

      <Section title="Agregar ejercicios">
        <Field label="Buscar" value={query} onChangeText={setQuery} placeholder="Ej. remo, hip thrust" />
        <QueryState isLoading={exercises.isLoading} error={exercises.error} onRetry={exercises.refetch} />
        {candidates.map((e) => (
          <Pressable key={e.id} onPress={() => add(e)}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>{e.name}</Text>
                <Text style={styles.muted}>{e.targetMuscles.map((m) => MUSCLE_LABELS[m]).join(' / ')}</Text>
              </View>
              <Text style={{ color: colors.accent, fontSize: 22 }}>+</Text>
            </Card>
          </Pressable>
        ))}
      </Section>

      <Button title={create.isPending ? 'Creando…' : 'Crear rutina'} onPress={submit} disabled={create.isPending} />
    </ScrollView>
  );
}
