import { Link, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRoutines } from '../../api/hooks';
import type { RoutineDto } from '../../api/types';
import { Button, Card, MuscleTag, QueryState, styles } from '../../components/ui';
import { colors, spacing, WEEKDAY_LONG } from '../../theme';

const daysAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
};

/** Las rutinas del usuario (plantillas de sesión). */
export default function RoutinesScreen() {
  const routines = useRoutines();
  return (
    <View style={styles.screen}>
      <QueryState isLoading={routines.isLoading} error={routines.error} onRetry={routines.refetch} />
      {routines.data && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={routines.isRefetching} onRefresh={routines.refetch} tintColor={colors.accent} />}>
          {routines.data.length === 0 && (
            <Text style={styles.muted}>Armá una rutina para entrenar y comparar con la última vez.</Text>
          )}
          {routines.data.map((r) => <RoutineCard key={r.id} routine={r} />)}
          <Button title="+ Nueva rutina" variant="ghost" onPress={() => router.push('/new-routine')} />
        </ScrollView>
      )}
    </View>
  );
}

/** Rutina con sus músculos; tocarla abre el entrenamiento. También se usa en Hoy. */
export function RoutineCard({ routine: r, highlight }: { routine: RoutineDto; highlight?: boolean }) {
  const muscles = [...new Set(r.exercises.map((e) => e.targetMuscle))];
  return (
    <Link href={{ pathname: '/routine/[id]', params: { id: r.id } }} asChild>
      <Pressable>
        <Card style={{ gap: spacing.sm, ...(highlight && { borderColor: colors.accent }) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: 2 }}>
              {r.weekday && <Text style={styles.label}>{WEEKDAY_LONG[r.weekday]}</Text>}
              <Text style={styles.title}>{r.name}</Text>
            </View>
            <Text style={styles.muted}>{r.lastPerformedAt ? daysAgo(r.lastPerformedAt) : 'sin hacer'}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {muscles.map((m) => <MuscleTag key={m} muscle={m} />)}
          </View>
          <Text style={styles.muted}>{r.exercises.length} ejercicios · {r.exercises.reduce((s, e) => s + e.sets, 0)} series</Text>
        </Card>
      </Pressable>
    </Link>
  );
}
