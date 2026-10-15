import { EXERCISE_TYPES, MUSCLES, type ExerciseType, type Muscle } from '@gym/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useCreateExercise } from '../api/hooks';
import { Button, Chips, Field, MultiChips, Section, styles } from '../components/ui';
import { MUSCLE_LABELS, spacing, TYPE_LABELS } from '../theme';

/** Ejercicio propio, para lo que no está en el catálogo. */
export default function NewExerciseScreen() {
  const create = useCreateExercise();
  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('compound');
  const [targets, setTargets] = useState<Muscle[]>([]);
  const [defaultTarget, setDefaultTarget] = useState<Muscle | null>(null);
  const [demoUrl, setDemoUrl] = useState('');

  const changeTargets = (next: Muscle[]) => {
    setTargets(next);
    if (!defaultTarget || !next.includes(defaultTarget)) setDefaultTarget(next[0] ?? null);
  };

  const submit = () => {
    if (!name.trim() || targets.length === 0) {
      Alert.alert('Faltan datos', 'Poné un nombre y elegí al menos un músculo.');
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        type,
        targetMuscles: targets,
        defaultTarget: defaultTarget ?? targets[0],
        ...(demoUrl.trim() && { demoUrl: demoUrl.trim() }),
      },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('No se pudo crear', e.message) },
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Hip thrust en máquina" autoFocus />

      <Section
        title="Tipo"
        hint={
          type === 'compound'
            ? 'Varias articulaciones (sentadilla, press, remo): más demandante, pocas repeticiones.'
            : 'Una articulación (curl, extensiones, elevaciones): más repeticiones.'
        }>
        <Chips options={EXERCISE_TYPES} value={type} onChange={(v) => v && setType(v)} labels={TYPE_LABELS} />
      </Section>

      <Section title="Músculos a los que puede contar" hint="Si según el enfoque cuenta para más de uno (ej. búlgara: glúteo o cuádriceps), elegí todos.">
        <MultiChips options={MUSCLES} value={targets} onChange={changeTargets} labels={MUSCLE_LABELS} />
      </Section>

      {targets.length > 1 && (
        <Section title="Enfoque por defecto" hint="Lo podés cambiar en cada rutina.">
          <Chips options={targets} value={defaultTarget} onChange={(v) => v && setDefaultTarget(v)} labels={MUSCLE_LABELS} />
        </Section>
      )}

      <Field label="Demostración (opcional)" value={demoUrl} onChangeText={setDemoUrl} placeholder="Link de YouTube o GIF" autoCapitalize="none" keyboardType="url" />
      <Text style={styles.muted}>Solo lo vas a ver vos.</Text>

      <Button title={create.isPending ? 'Creando…' : 'Crear ejercicio'} onPress={submit} disabled={create.isPending} />
    </ScrollView>
  );
}
