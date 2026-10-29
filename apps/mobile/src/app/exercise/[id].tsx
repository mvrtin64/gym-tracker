import { workingSets, workingWeight } from '@gym/domain';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useExercise, useHistory, useUpdateExerciseSettings } from '../../api/hooks';
import type { HistoryItemDto } from '../../api/types';
import { Button, Card, Field, QueryState, styles } from '../../components/ui';
import { WeightChart } from '../../components/WeightChart';
import { colors, MUSCLE_LABELS, spacing, TYPE_LABELS } from '../../theme';

const toNumber = (s: string) => Number(s.replace(',', '.'));

/** Detalle de un ejercicio: tip del coach, demostración, anotación del usuario e historial. */
export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);
  const history = useHistory(id);
  const update = useUpdateExerciseSettings(id);
  const [note, setNote] = useState('');
  const [increment, setIncrement] = useState('');

  // El formulario se carga con lo guardado cada vez que llegan datos nuevos (ajuste durante el render).
  const [loaded, setLoaded] = useState<typeof exercise.data>();
  if (exercise.data && exercise.data !== loaded) {
    setLoaded(exercise.data);
    setNote(exercise.data.settings.note ?? '');
    setIncrement(String(exercise.data.settings.weightIncrementKg));
  }

  const save = () => {
    const weightIncrementKg = toNumber(increment);
    if (!Number.isFinite(weightIncrementKg) || weightIncrementKg < 0.25) {
      Alert.alert('Revisá el incremento', 'Tiene que ser un número de al menos 0.25 kg.');
      return;
    }
    update.mutate(
      { note, weightIncrementKg },
      { onSuccess: () => Alert.alert('Guardado'), onError: (e) => Alert.alert('No se guardó', e.message) },
    );
  };

  const openDemo = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert('No se pudo abrir', 'Revisá el link del video.'));

  const e = exercise.data;
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: e?.name ?? '' }} />
      <QueryState isLoading={exercise.isLoading} error={exercise.error} onRetry={exercise.refetch} />
      {e && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={styles.muted}>
            {TYPE_LABELS[e.type]} · cuenta para {e.targetMuscles.map((m) => MUSCLE_LABELS[m]).join(' o ')}
            {e.isOwn ? ' · ejercicio propio' : ''}
          </Text>

          {e.coachTip && (
            <Card style={{ gap: spacing.xs, borderColor: colors.accent }}>
              <Text style={[styles.label, { color: colors.accent }]}>Tip del coach</Text>
              <Text style={styles.text}>{e.coachTip}</Text>
            </Card>
          )}
          {e.demoUrl && <Button title="▶ Ver técnica" variant="ghost" onPress={() => openDemo(e.demoUrl!)} />}

          <Card style={{ gap: spacing.md }}>
            <Text style={styles.title}>Tu anotación</Text>
            <Field
              label="Para no olvidarte (ángulos, alturas, agarre…)"
              value={note}
              onChangeText={setNote}
              placeholder="Ej. banco a 30°, asiento en el 4"
              multiline
            />
            <View style={{ flexDirection: 'row' }}>
              <Field label="Incremento de peso (kg)" keyboardType="decimal-pad" value={increment} onChangeText={setIncrement} />
            </View>
            <Button title={update.isPending ? 'Guardando…' : 'Guardar'} onPress={save} disabled={update.isPending} />
          </Card>

          <View style={{ gap: spacing.sm }}>
            {history.data && <WeightChart history={history.data} />}
            <Text style={styles.title}>Historial</Text>
            {history.data?.length === 0 && <Text style={styles.muted}>Todavía no lo hiciste en ninguna sesión.</Text>}
            {history.data?.map((h) => <HistoryRow key={h.sessionId} item={h} />)}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function HistoryRow({ item }: { item: HistoryItemDto }) {
  const sets = workingSets(item.sets);
  const weight = workingWeight(item.sets);
  return (
    <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ gap: 2, flex: 1 }}>
        <Text style={styles.text}>
          {new Date(item.performedAt).toLocaleDateString()} · {MUSCLE_LABELS[item.targetMuscle]}
        </Text>
        <Text style={styles.muted}>
          {sets.map((s) => `${s.weightKg}×${s.reps}${s.rir !== undefined ? ` (RIR ${s.rir})` : ''}`).join('  ')}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.label}>Peso</Text>
        <Text style={styles.text}>{weight ?? '—'} kg</Text>
      </View>
    </Card>
  );
}
