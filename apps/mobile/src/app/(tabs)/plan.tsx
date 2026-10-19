import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useGenerateRoutines, usePlan, useRoutines } from '../../api/hooks';
import { Button, Card, QueryState, styles } from '../../components/ui';
import { colors, DAY_KIND_LABELS, MUSCLE_LABELS, spacing, WEEKDAY_LONG } from '../../theme';

/** Vista previa de la semana: músculos y series de cada día según el perfil y el volumen. */
export default function PlanScreen() {
  const plan = usePlan();
  return (
    <View style={styles.screen}>
      <QueryState isLoading={plan.isLoading} error={plan.error} onRetry={plan.refetch} />
      {plan.data && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={styles.muted}>
            Cómo se reparte tu volumen semanal. Cada número es la cantidad de series de ese músculo en el día, dividida en ejercicios.
          </Text>
          {plan.data.days.map((day) => (
            <Card key={day.weekday} style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={styles.title}>{WEEKDAY_LONG[day.weekday]}</Text>
                <Text style={styles.muted}>{DAY_KIND_LABELS[day.kind]} · {day.totalSets} series</Text>
              </View>
              {day.muscles.length === 0 && <Text style={styles.muted}>Descanso activo: sin series asignadas.</Text>}
              {day.muscles.map((m) => (
                <View key={m.muscle} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.text}>{MUSCLE_LABELS[m.muscle]}</Text>
                  <Text style={styles.muted}>
                    {m.sets} series{m.exerciseSets.length > 1 ? ` (${m.exerciseSets.join(' + ')})` : ''}
                  </Text>
                </View>
              ))}
            </Card>
          ))}
          {plan.data.frequencyChanges.length > 0 && (
            <Card style={{ gap: spacing.xs, borderColor: colors.warning }}>
              <Text style={[styles.label, { color: colors.warning }]}>Frecuencia ajustada</Text>
              {plan.data.frequencyChanges.map((c) => (
                <Text key={c.muscle} style={styles.muted}>
                  {MUSCLE_LABELS[c.muscle]}: {c.actual} {c.actual === 1 ? 'vez' : 'veces'} en vez de {c.ideal}, porque {c.reason}.
                </Text>
              ))}
            </Card>
          )}
          <GenerateCard />
        </ScrollView>
      )}
    </View>
  );
}

/** Arma las rutinas de la semana con este plan (§3.4). Avisa si va a reemplazar las generadas antes. */
function GenerateCard() {
  const routines = useRoutines();
  const generate = useGenerateRoutines();
  const hasGenerated = (routines.data ?? []).some((r) => r.origin === 'generated');

  const run = () =>
    generate.mutate(undefined, {
      onSuccess: () => router.push('/routines'),
      onError: (e) => Alert.alert('No se pudieron armar', e.message),
    });
  const confirm = () =>
    hasGenerated
      ? Alert.alert('Volver a armar', 'Se reemplazan las rutinas que armó la app antes. Las tuyas no se tocan.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Armar', onPress: run },
        ])
      : run();

  return (
    <Card style={{ gap: spacing.sm, borderColor: colors.accent }}>
      <Text style={styles.title}>Armá tus rutinas</Text>
      <Text style={styles.muted}>
        Una rutina por día con 1 a 3 ejercicios por músculo: primero multiarticulares, después aislamiento. Después podés
        cambiar cualquier ejercicio o sumar los tuyos.
      </Text>
      <Button
        title={generate.isPending ? 'Armando…' : hasGenerated ? 'Volver a armar mis rutinas' : 'Armar mis rutinas'}
        onPress={confirm}
        disabled={generate.isPending}
      />
    </Card>
  );
}
