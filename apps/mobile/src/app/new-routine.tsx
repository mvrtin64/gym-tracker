import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useCreateRoutine, useExercises } from '../api/hooks';
import { Button, Card, Field, QueryState, styles } from '../components/ui';
import { colors, spacing, TYPE_LABELS } from '../theme';

export default function NewRoutineScreen() {
  const exercises = useExercises();
  const create = useCreateRoutine();
  const [name, setName] = useState('');
  /** Ejercicios elegidos, en el orden en que se tocaron (= orden de la rutina). */
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = () => {
    if (!name.trim() || selected.length === 0) {
      Alert.alert('Faltan datos', 'Poné un nombre y elegí al menos un ejercicio.');
      return;
    }
    create.mutate(
      { name: name.trim(), exerciseIds: selected },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert('No se pudo crear', e.message) },
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej. Empuje, Pierna, Torso A" autoFocus />
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.label}>Ejercicios (tocá en el orden en que los hacés)</Text>
        <QueryState isLoading={exercises.isLoading} error={exercises.error} onRetry={exercises.refetch} />
        {exercises.data?.map((e) => {
          const pos = selected.indexOf(e.id);
          return (
            <Pressable key={e.id} onPress={() => toggle(e.id)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderColor: pos >= 0 ? colors.accent : colors.border }}>
                <View
                  style={{
                    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: pos >= 0 ? colors.accent : colors.border,
                    backgroundColor: pos >= 0 ? colors.accent : 'transparent',
                  }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{pos >= 0 ? pos + 1 : ''}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>{e.name}</Text>
                  <Text style={styles.muted}>{TYPE_LABELS[e.type]} · {e.sets}×{e.repMin}-{e.repMax}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      <Button title={create.isPending ? 'Creando…' : 'Crear rutina'} onPress={submit} disabled={create.isPending} />
    </ScrollView>
  );
}
