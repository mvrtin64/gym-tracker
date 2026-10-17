import { MUSCLES } from '@gym/domain';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useExercises } from '../../api/hooks';
import { Button, Card, Field, QueryState, styles } from '../../components/ui';
import { colors, MUSCLE_LABELS, spacing, TYPE_LABELS } from '../../theme';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Catálogo global más los ejercicios propios, agrupados por músculo. */
export default function ExercisesScreen() {
  const exercises = useExercises();
  const [query, setQuery] = useState('');
  const visible = (exercises.data ?? []).filter((e) => normalize(e.name).includes(normalize(query)));

  return (
    <View style={styles.screen}>
      <QueryState isLoading={exercises.isLoading} error={exercises.error} onRetry={exercises.refetch} />
      {exercises.data && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} keyboardShouldPersistTaps="handled">
          <Field label="Buscar" value={query} onChangeText={setQuery} placeholder="Ej. remo, hip thrust" />
          {MUSCLES.map((muscle) => {
            const items = visible.filter((e) => e.defaultTarget === muscle);
            if (items.length === 0) return null;
            return (
              <View key={muscle} style={{ gap: spacing.sm }}>
                <Text style={[styles.label, { marginTop: spacing.sm }]}>{MUSCLE_LABELS[muscle]}</Text>
                {items.map((e) => (
                  <Link key={e.id} href={{ pathname: '/exercise/[id]', params: { id: e.id } }} asChild>
                    <Pressable>
                      <Card style={{ gap: 2 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={styles.text}>{e.name}</Text>
                          {e.isOwn && <Text style={{ color: colors.accent, fontSize: 12 }}>Propio</Text>}
                        </View>
                        <Text style={styles.muted}>
                          {TYPE_LABELS[e.type]}
                          {e.targetMuscles.length > 1 ? ` · también ${e.targetMuscles.slice(1).map((m) => MUSCLE_LABELS[m]).join(', ')}` : ''}
                          {e.settings.note ? ' · 📝' : ''}
                        </Text>
                      </Card>
                    </Pressable>
                  </Link>
                ))}
              </View>
            );
          })}
          <Button title="+ Ejercicio propio" variant="ghost" onPress={() => router.push('/new-exercise')} />
        </ScrollView>
      )}
    </View>
  );
}
