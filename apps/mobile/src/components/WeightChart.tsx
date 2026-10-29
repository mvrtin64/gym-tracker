import { workingWeight } from '@gym/domain';
import { Text, View } from 'react-native';
import type { HistoryItemDto } from '../api/types';
import { colors, radius, spacing } from '../theme';
import { Card, styles } from './ui';

const CHART_HEIGHT = 120;
/** Altura mínima de una barra: la escala arranca en el peso más bajo, no en 0, para que se note +2.5 kg. */
const MIN_BAR = 16;

const kg = (n: number) => `${Number(n.toFixed(2))} kg`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });

/** Evolución del peso de trabajo de un ejercicio, sesión a sesión (de la más vieja a la más nueva). */
export function WeightChart({ history }: { history: HistoryItemDto[] }) {
  const points = history
    .map((h) => ({ id: h.sessionId, date: h.performedAt, isDeload: h.isDeload, weight: workingWeight(h.sets) }))
    .filter((p): p is typeof p & { weight: number } => p.weight !== undefined)
    .reverse();

  if (points.length < 2) {
    return (
      <Card style={{ gap: spacing.xs }}>
        <Text style={styles.title}>Peso de trabajo</Text>
        <Text style={styles.muted}>Con dos sesiones registradas vas a ver acá cómo sube el peso.</Text>
      </Card>
    );
  }

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const height = (w: number) => (max === min ? CHART_HEIGHT * 0.6 : MIN_BAR + ((w - min) / (max - min)) * (CHART_HEIGHT - MIN_BAR));
  const first = points[0];
  const last = points[points.length - 1];
  const change = last.weight - first.weight;

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text style={styles.title}>Peso de trabajo</Text>
        <Text style={styles.muted}>
          Última: {kg(last.weight)}
          {change !== 0 && ` · ${change > 0 ? '+' : '−'}${kg(Math.abs(change))} en ${points.length} sesiones`}
        </Text>
      </View>

      <View style={{ height: CHART_HEIGHT + 18, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        {points.map((p, i) => {
          // El número va solo donde cambia el peso, para no amontonar etiquetas.
          const showLabel = i === 0 || p.weight !== points[i - 1].weight;
          return (
            <View key={p.id} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              {showLabel && (
                <Text style={{ color: colors.muted, fontSize: 10 }} numberOfLines={1} adjustsFontSizeToFit>
                  {Number(p.weight.toFixed(2))}
                </Text>
              )}
              <View
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: height(p.weight),
                  borderRadius: radius.sm,
                  backgroundColor: p.isDeload ? colors.accentMuted : colors.accent,
                }}
              />
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.muted}>{shortDate(first.date)}</Text>
        <Text style={styles.muted}>{shortDate(last.date)}</Text>
      </View>
      {points.some((p) => p.isDeload) && <Text style={styles.muted}>Las barras apagadas son sesiones de descarga.</Text>}
    </Card>
  );
}
