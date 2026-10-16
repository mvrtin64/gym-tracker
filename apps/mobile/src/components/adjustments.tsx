import { Alert, Text, View } from 'react-native';
import { useResolveChange, useResolveDeload } from '../api/hooks';
import type { DeloadDto, SessionReviewDto, VolumeChangeDto } from '../api/types';
import { colors, MUSCLE_LABELS, spacing } from '../theme';
import { Button, Card, styles } from './ui';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const sets = (n: number) => `${n} ${n === 1 ? 'serie' : 'series'}`;

/** Descarga propuesta (para aceptar o descartar) o en curso (con su fase). */
export function DeloadCard({ deload }: { deload: DeloadDto }) {
  const resolve = useResolveDeload();
  const act = (action: 'start' | 'dismiss') =>
    resolve.mutate({ id: deload.id, action }, { onError: (e) => Alert.alert('No se pudo guardar', e.message) });

  if (deload.status === 'suggested') {
    return (
      <Card style={{ gap: spacing.sm, borderColor: colors.warning }}>
        <Text style={styles.title}>Semana de descarga sugerida</Text>
        <Text style={styles.muted}>{deload.reason}</Text>
        <Text style={styles.text}>Mitad de series, mitad de peso y RIR 4–5 durante 7 días. Después el volumen vuelve de a poco.</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Empezar hoy" onPress={() => act('start')} disabled={resolve.isPending} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Ahora no" variant="ghost" onPress={() => act('dismiss')} disabled={resolve.isPending} />
          </View>
        </View>
      </Card>
    );
  }
  return (
    <Card style={{ gap: spacing.xs, borderColor: colors.accent }}>
      <Text style={styles.title}>{deload.phase === 'deload' ? 'Semana de descarga' : 'Volviendo de la descarga'}</Text>
      <Text style={styles.muted}>
        {deload.phase === 'deload'
          ? `Hasta el ${shortDate(deload.endsAt!)}: mitad de series y de peso, dejando 4–5 reps en reserva.`
          : `El volumen sube 2 series por semana; vuelve al de antes el ${shortDate(deload.doneAt!)}.`}
      </Text>
    </Card>
  );
}

/** Sugerencias de volumen pendientes, para aceptar o descartar. */
export function PendingChanges({ changes }: { changes: VolumeChangeDto[] }) {
  const resolve = useResolveChange();
  if (changes.length === 0) return null;
  const act = (id: string, action: 'accept' | 'dismiss') =>
    resolve.mutate({ id, action }, { onError: (e) => Alert.alert('No se pudo guardar', e.message) });

  return (
    <Card style={{ gap: spacing.md, borderColor: colors.warning }}>
      <Text style={styles.title}>Sugerencias de volumen</Text>
      {changes.map((c) => (
        <View key={c.id} style={{ gap: spacing.xs }}>
          <Text style={styles.text}>
            {MUSCLE_LABELS[c.muscle]}: bajar {sets(-c.delta)} por semana
          </Text>
          <Text style={styles.muted}>{c.reason}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="Aceptar" onPress={() => act(c.id, 'accept')} disabled={resolve.isPending} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Descartar" variant="ghost" onPress={() => act(c.id, 'dismiss')} disabled={resolve.isPending} />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

/** Qué decidió la app sobre el volumen al terminar el entrenamiento. */
export function ReviewCard({ review }: { review: SessionReviewDto }) {
  const { volumeChanges, pushHarder, deload } = review;
  if (volumeChanges.length === 0 && pushHarder.length === 0 && !deload) return null;
  return (
    <Card style={{ gap: spacing.md, borderColor: colors.warning }}>
      <Text style={styles.title}>Ajustes</Text>
      {deload && (
        <Text style={styles.text}>
          {deload.status === 'started' ? '🔄 Arrancó una semana de descarga. ' : '🔄 Te sugerimos una semana de descarga (la ves en el inicio). '}
          <Text style={styles.muted}>{deload.reason}</Text>
        </Text>
      )}
      {volumeChanges.map((c) => (
        <View key={c.id} style={{ gap: 2 }}>
          <Text style={styles.text}>
            {c.status === 'applied'
              ? `↓ ${MUSCLE_LABELS[c.muscle]}: se bajó ${sets(-c.delta)} por semana.`
              : `↓ ${MUSCLE_LABELS[c.muscle]}: te sugerimos bajar ${sets(-c.delta)} por semana (aceptala en el inicio).`}
          </Text>
          <Text style={styles.muted}>{c.reason}</Text>
        </View>
      ))}
      {pushHarder.map((p) => (
        <View key={p.muscle} style={{ gap: 2 }}>
          <Text style={styles.text}>💪 {MUSCLE_LABELS[p.muscle]}: apretá más</Text>
          <Text style={styles.muted}>{p.reason}</Text>
        </View>
      ))}
    </Card>
  );
}
