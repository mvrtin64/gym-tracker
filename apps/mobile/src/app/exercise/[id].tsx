import { estimateOneRepMax, workingSets, type NextTarget } from '@gym/domain';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useExercise, useHistory, useLogSession, useNextTarget } from '../../api/hooks';
import type { HistoryItemDto } from '../../api/types';
import { Button, Card, Field, QueryState, styles } from '../../components/ui';
import { colors, DECISION_UI, spacing } from '../../theme';

interface Row {
  weight: string;
  reps: string;
}

const toNumber = (s: string) => Number(s.replace(',', '.'));
const rowsFrom = (t: NextTarget): Row[] =>
  Array.from({ length: t.sets }, () => ({ weight: String(t.weightKg), reps: String(t.reps) }));

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);
  const target = useNextTarget(id);
  const history = useHistory(id);
  const logSession = useLogSession();
  const [rows, setRows] = useState<Row[]>([]);

  // Precarga las series con el objetivo sugerido cada vez que cambia.
  useEffect(() => {
    if (target.data) setRows(rowsFrom(target.data));
  }, [target.data]);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = () => {
    const sets = rows.map((r) => ({ weightKg: toNumber(r.weight), reps: toNumber(r.reps) }));
    if (sets.some((s) => !Number.isFinite(s.weightKg) || !Number.isInteger(s.reps) || s.reps < 0)) {
      Alert.alert('Revisá las series', 'Peso y repeticiones tienen que ser números.');
      return;
    }
    logSession.mutate(
      { entries: [{ exerciseId: id, sets }] },
      { onError: (e) => Alert.alert('No se guardó', e.message) },
    );
  };

  const loading = exercise.isLoading || target.isLoading;
  const error = exercise.error ?? target.error;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: exercise.data?.name ?? '' }} />
      <QueryState isLoading={loading} error={error} onRetry={() => { exercise.refetch(); target.refetch(); }} />
      {target.data && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <TargetCard target={target.data} />

          <Card style={{ gap: spacing.md }}>
            <Text style={styles.title}>Registrar sesión</Text>
            {rows.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
                <Text style={[styles.muted, { width: 22, paddingBottom: 12 }]}>{i + 1}</Text>
                <Field label="Peso (kg)" keyboardType="decimal-pad" value={r.weight} onChangeText={(v) => updateRow(i, { weight: v })} />
                <Field label="Reps" keyboardType="number-pad" value={r.reps} onChangeText={(v) => updateRow(i, { reps: v })} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'center' }}>
              <Pressable onPress={() => setRows((rs) => [...rs, rs[rs.length - 1] ?? { weight: '0', reps: '0' }])}>
                <Text style={{ color: colors.accent }}>+ Serie</Text>
              </Pressable>
              {rows.length > 1 && (
                <Pressable onPress={() => setRows((rs) => rs.slice(0, -1))}>
                  <Text style={{ color: colors.muted }}>− Serie</Text>
                </Pressable>
              )}
            </View>
            <Button title={logSession.isPending ? 'Guardando…' : 'Guardar sesión'} onPress={save} disabled={logSession.isPending} />
          </Card>

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.title}>Historial</Text>
            {history.data?.length === 0 && <Text style={styles.muted}>Sin sesiones todavía.</Text>}
            {history.data?.map((h) => <HistoryRow key={h.sessionId} item={h} />)}
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function TargetCard({ target }: { target: NextTarget }) {
  const ui = DECISION_UI[target.decision];
  return (
    <Card style={{ gap: spacing.sm, borderColor: ui.color }}>
      <Text style={[styles.label, { color: ui.color }]}>Próxima sesión · {ui.label}</Text>
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>
        {target.sets} × {target.reps} <Text style={{ color: colors.muted, fontSize: 20 }}>@</Text> {target.weightKg} kg
      </Text>
      <Text style={styles.muted}>{target.reason}</Text>
    </Card>
  );
}

function HistoryRow({ item }: { item: HistoryItemDto }) {
  const sets = workingSets(item.sets);
  const best = Math.max(0, ...sets.map((s) => estimateOneRepMax(s.weightKg, s.reps)));
  return (
    <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <View style={{ gap: 2, flex: 1 }}>
        <Text style={styles.text}>{new Date(item.performedAt).toLocaleDateString()}</Text>
        <Text style={styles.muted}>{sets.map((s) => `${s.weightKg}×${s.reps}`).join('  ')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.label}>1RM est.</Text>
        <Text style={styles.text}>{best} kg</Text>
      </View>
    </Card>
  );
}
