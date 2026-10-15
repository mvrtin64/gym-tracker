import { ScrollView, Text, View } from 'react-native';
import { usePlan } from '../api/hooks';
import { Card, QueryState, styles } from '../components/ui';
import { colors, DAY_KIND_LABELS, MUSCLE_LABELS, spacing, WEEKDAY_LONG } from '../theme';

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
        </ScrollView>
      )}
    </View>
  );
}
