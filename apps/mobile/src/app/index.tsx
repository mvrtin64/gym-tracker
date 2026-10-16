import { Link, Redirect, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useProfile, useRoutines, useVolume } from '../api/hooks';
import type { VolumeSummaryDto } from '../api/types';
import { DeloadCard, PendingChanges } from '../components/adjustments';
import { Button, Card, ProgressBar, QueryState, styles } from '../components/ui';
import { colors, LEVEL_LABELS, MUSCLE_LABELS, spacing, WEEKDAY_LABELS } from '../theme';

const daysAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
};

export default function HomeScreen() {
  const profile = useProfile();
  if (profile.isLoading || profile.error) {
    return (
      <View style={styles.screen}>
        <QueryState isLoading={profile.isLoading} error={profile.error} onRetry={profile.refetch} />
      </View>
    );
  }
  // Sin perfil no hay volumen ni plan: primero el onboarding.
  if (!profile.data) return <Redirect href="/onboarding" />;
  return <Dashboard levelLabel={LEVEL_LABELS[profile.data.level]} />;
}

function Dashboard({ levelLabel }: { levelLabel: string }) {
  const routines = useRoutines();
  const volume = useVolume();
  const refetch = () => { routines.refetch(); volume.refetch(); };

  return (
    <View style={styles.screen}>
      <QueryState isLoading={routines.isLoading || volume.isLoading} error={routines.error ?? volume.error} onRetry={refetch} />
      {routines.data && volume.data && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={routines.isRefetching} onRefresh={refetch} tintColor={colors.accent} />}>
          {volume.data.deload && <DeloadCard deload={volume.data.deload} />}
          <PendingChanges changes={volume.data.pendingChanges} />
          <WeekCard volume={volume.data} />
          <Button title="Ver plan de la semana" variant="ghost" onPress={() => router.push('/plan')} />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Rutinas</Text>
          {routines.data.length === 0 && <Text style={styles.muted}>Armá una rutina para entrenar y comparar con la última vez.</Text>}
          {routines.data.map((r) => (
            <Link key={r.id} href={{ pathname: '/routine/[id]', params: { id: r.id } }} asChild>
              <Pressable>
                <Card style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.title}>{r.weekday ? `${WEEKDAY_LABELS[r.weekday]} · ` : ''}{r.name}</Text>
                    <Text style={styles.muted}>{r.lastPerformedAt ? daysAgo(r.lastPerformedAt) : 'sin hacer'}</Text>
                  </View>
                  <Text style={styles.muted}>{r.exercises.map((e) => e.exercise.name).join(' · ')}</Text>
                </Card>
              </Pressable>
            </Link>
          ))}
          <Button title="+ Nueva rutina" variant="ghost" onPress={() => router.push('/new-routine')} />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Más</Text>
          <Button title="Catálogo de ejercicios" variant="ghost" onPress={() => router.push('/exercises')} />
          <Button title={`Editar perfil (${levelLabel})`} variant="ghost" onPress={() => router.push('/onboarding')} />
        </ScrollView>
      )}
    </View>
  );
}

/** Series efectivas hechas esta semana contra el objetivo de cada músculo. */
function WeekCard({ volume }: { volume: VolumeSummaryDto }) {
  const muscles = volume.muscles.filter((m) => m.target > 0);
  const done = muscles.reduce((sum, m) => sum + Math.min(m.done, m.target), 0);
  const target = muscles.reduce((sum, m) => sum + m.target, 0);
  const title = volume.deload?.phase === 'deload' ? 'Esta semana (descarga)' : volume.deload?.phase === 'returning' ? 'Esta semana (volviendo)' : 'Esta semana';
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{done} de {target} series</Text>
      </View>
      {muscles.map((m) => (
        <View key={m.muscle} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.text}>{MUSCLE_LABELS[m.muscle]}</Text>
            <Text style={[styles.muted, m.done >= m.target && { color: colors.success }]}>
              {m.done}/{m.target}
              {m.target < m.baseTarget ? ` (de ${m.baseTarget})` : ''}
            </Text>
          </View>
          <ProgressBar done={m.done} target={m.target} />
        </View>
      ))}
    </Card>
  );
}
