import { WEEKDAYS, type Weekday } from '@gym/domain';
import { Redirect, router } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile, useRoutines, useVolume } from '../../api/hooks';
import type { ProfileDto, VolumeSummaryDto } from '../../api/types';
import { DeloadCard, PendingChanges } from '../../components/adjustments';
import { Button, Card, ProgressBar, QueryState, ScreenHeader, styles } from '../../components/ui';
import { colors, MUSCLE_COLORS, MUSCLE_LABELS, spacing } from '../../theme';
import { RoutineCard } from './routines';

/** Día de la semana de hoy con las claves del dominio (getDay: 0 = domingo). */
const todayWeekday = (): Weekday => WEEKDAYS[(new Date().getDay() + 6) % 7];
const longDate = () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

export default function TodayScreen() {
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
  return <Today profile={profile.data} />;
}

function Today({ profile }: { profile: ProfileDto }) {
  const routines = useRoutines();
  const volume = useVolume();
  const refetch = () => { routines.refetch(); volume.refetch(); };
  const today = todayWeekday();
  const todays = (routines.data ?? []).filter((r) => r.weekday === today);
  const trainingDay = profile.trainingDays.includes(today);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <QueryState isLoading={routines.isLoading || volume.isLoading} error={routines.error ?? volume.error} onRetry={refetch} />
      {routines.data && volume.data && (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={routines.isRefetching} onRefresh={refetch} tintColor={colors.accent} />}>
          <ScreenHeader overline={longDate()} title="Hoy" />

          {volume.data.deload && <DeloadCard deload={volume.data.deload} />}
          <PendingChanges changes={volume.data.pendingChanges} />

          {todays.map((r) => <RoutineCard key={r.id} routine={r} highlight />)}
          {todays.length === 0 && (
            <Card style={{ gap: spacing.sm }}>
              <Text style={styles.title}>{trainingDay ? 'Hoy toca entrenar' : 'Día de descanso'}</Text>
              <Text style={styles.muted}>
                {trainingDay
                  ? 'No tenés una rutina asignada a hoy: elegí una de tus rutinas.'
                  : 'Hoy no está entre tus días de entrenamiento. Si querés entrenar igual, elegí una rutina.'}
              </Text>
              <Button title="Ver rutinas" variant="secondary" onPress={() => router.push('/routines')} />
            </Card>
          )}

          <WeekCard volume={volume.data} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Series efectivas hechas esta semana contra el objetivo de cada músculo. */
function WeekCard({ volume }: { volume: VolumeSummaryDto }) {
  const muscles = volume.muscles.filter((m) => m.target > 0);
  const done = muscles.reduce((sum, m) => sum + Math.min(m.done, m.target), 0);
  const target = muscles.reduce((sum, m) => sum + m.target, 0);
  const title = volume.deload?.phase === 'deload' ? 'Semana de descarga' : volume.deload?.phase === 'returning' ? 'Semana (volviendo)' : 'Esta semana';
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.muted}>{done} de {target} series</Text>
      </View>
      <ProgressBar done={done} target={target} />
      {muscles.map((m) => (
        <View key={m.muscle} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MUSCLE_COLORS[m.muscle] }} />
              <Text style={styles.text}>{MUSCLE_LABELS[m.muscle]}</Text>
            </View>
            <Text style={[styles.muted, m.done >= m.target && { color: colors.success }]}>
              {m.done}/{m.target}
              {m.target < m.baseTarget ? ` (de ${m.baseTarget})` : ''}
            </Text>
          </View>
          <ProgressBar done={m.done} target={m.target} color={MUSCLE_COLORS[m.muscle]} />
        </View>
      ))}
    </Card>
  );
}
