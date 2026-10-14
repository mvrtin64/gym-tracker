import { EXERCISE_TYPES, MUSCLE_GROUPS, SCHEME_PRESETS, type ExerciseType, type MuscleGroup } from '@gym/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useCreateExercise } from '../api/hooks';
import { Button, Field, styles } from '../components/ui';
import { colors, MUSCLE_LABELS, spacing, TYPE_LABELS } from '../theme';

const toNumber = (s: string) => Number(s.replace(',', '.'));
const presetFields = (type: ExerciseType) => {
  const p = SCHEME_PRESETS[type];
  return { sets: String(p.sets), repMin: String(p.repRange.min), repMax: String(p.repRange.max), weightIncrementKg: String(p.weightIncrementKg) };
};

function Chips<T extends string>({ options, value, onChange, labels }: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={{
            paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
            borderColor: o === value ? colors.accent : colors.border,
            backgroundColor: o === value ? colors.accent : 'transparent',
          }}>
          <Text style={{ color: colors.text }}>{labels[o]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function NewExerciseScreen() {
  const create = useCreateExercise();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest');
  const [type, setType] = useState<ExerciseType>('compound');
  const [form, setForm] = useState({ ...presetFields('compound'), startingWeightKg: '20' });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  // Cambiar el tipo carga su rango por defecto (multiarticular: pocas reps; monoarticular: más).
  const changeType = (t: ExerciseType) => {
    setType(t);
    setForm((f) => ({ ...f, ...presetFields(t) }));
  };

  const submit = () => {
    const nums = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, toNumber(v)]));
    if (!name.trim() || Object.values(nums).some((n) => !Number.isFinite(n))) {
      Alert.alert('Faltan datos', 'Completá el nombre y usá números en los campos.');
      return;
    }
    create.mutate(
      { name: name.trim(), muscleGroup, type, ...nums },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('No se pudo crear', e.message) },
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Peso muerto" autoFocus />

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.label}>Tipo</Text>
        <Chips options={EXERCISE_TYPES} value={type} onChange={changeType} labels={TYPE_LABELS} />
        <Text style={styles.muted}>
          {type === 'compound'
            ? 'Varias articulaciones (sentadilla, press, remo): más demandante, pocas repeticiones.'
            : 'Una articulación (curl, extensiones, elevaciones): más repeticiones.'}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.label}>Grupo muscular</Text>
        <Chips options={MUSCLE_GROUPS} value={muscleGroup} onChange={setMuscleGroup} labels={MUSCLE_LABELS} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Field label="Series" keyboardType="number-pad" value={form.sets} onChangeText={set('sets')} />
        <Field label="Reps mín" keyboardType="number-pad" value={form.repMin} onChangeText={set('repMin')} />
        <Field label="Reps máx" keyboardType="number-pad" value={form.repMax} onChangeText={set('repMax')} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Field label="Peso inicial (kg)" keyboardType="decimal-pad" value={form.startingWeightKg} onChangeText={set('startingWeightKg')} />
        <Field label="Incremento (kg)" keyboardType="decimal-pad" value={form.weightIncrementKg} onChangeText={set('weightIncrementKg')} />
      </View>
      <Text style={styles.muted}>
        Cuando completes {form.sets}×{form.repMax}, la app te sube {form.weightIncrementKg} kg y volvés a {form.repMin} reps.
      </Text>

      <Button title={create.isPending ? 'Creando…' : 'Crear ejercicio'} onPress={submit} disabled={create.isPending} />
    </ScrollView>
  );
}
