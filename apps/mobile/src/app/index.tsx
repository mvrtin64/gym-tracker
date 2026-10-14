import { Link, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useExercises, useRoutines } from '../api/hooks';
import { Button, Card, QueryState, styles } from '../components/ui';
import { colors, MUSCLE_LABELS, spacing, TYPE_LABELS } from '../theme';

const daysAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
};

export default function HomeScreen() {
  const routines = useRoutines();
  const exercises = useExercises();
  const refetch = () => { routines.refetch(); exercises.refetch(); };

  return (
    <View style={styles.screen}>
      <QueryState isLoading={routines.isLoading || exercises.isLoading} error={routines.error ?? exercises.error} onRetry={refetch} />
      {routines.data && exercises.data && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={routines.isRefetching} onRefresh={refetch} tintColor={colors.accent} />}>
          <Text style={styles.label}>Rutinas</Text>
          {routines.data.length === 0 && <Text style={styles.muted}>Armá una rutina para entrenar y comparar con la última vez.</Text>}
          {routines.data.map((r) => (
            <Link key={r.id} href={{ pathname: '/routine/[id]', params: { id: r.id } }} asChild>
              <Pressable>
                <Card style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.title}>{r.name}</Text>
                    <Text style={styles.muted}>{r.lastPerformedAt ? daysAgo(r.lastPerformedAt) : 'sin hacer'}</Text>
                  </View>
                  <Text style={styles.muted}>{r.exercises.map((e) => e.name).join(' · ')}</Text>
                </Card>
              </Pressable>
            </Link>
          ))}
          <Button title="+ Nueva rutina" variant="ghost" onPress={() => router.push('/new-routine')} />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Ejercicios</Text>
          {exercises.data.length === 0 && <Text style={styles.muted}>Todavía no cargaste ejercicios.</Text>}
          {exercises.data.map((item) => (
            <Link key={item.id} href={{ pathname: '/exercise/[id]', params: { id: item.id } }} asChild>
              <Pressable>
                <Card>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.muted}>
                    {TYPE_LABELS[item.type]} · {MUSCLE_LABELS[item.muscleGroup]} · {item.sets}×{item.repMin}-{item.repMax} · +{item.weightIncrementKg} kg
                  </Text>
                </Card>
              </Pressable>
            </Link>
          ))}
          <Button title="+ Nuevo ejercicio" variant="ghost" onPress={() => router.push('/new-exercise')} />
        </ScrollView>
      )}
    </View>
  );
}
