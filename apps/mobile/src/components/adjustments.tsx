import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useReplaceExercise, useResolveChange, useResolveDeload } from '../api/hooks';
import type { DeloadDto, JointPainReviewDto, SessionReviewDto, VolumeChangeDto } from '../api/types';
import { colors, MUSCLE_LABELS, spacing } from '../theme';
import { Button, Card, Chips, styles } from './ui';

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

/**
 * Dolor articular al terminar el entrenamiento (§6.5): aviso la primera vez; si se repite, el peso al
 * que bajar o con qué ejercicio cambiarlo en la rutina.
 */
export function JointPainCard({ items, routineId }: { items: JointPainReviewDto[]; routineId?: string }) {
  const replace = useReplaceExercise(routineId ?? '');
  const [replaced, setReplaced] = useState<Record<string, string>>({});
  if (items.length === 0) return null;

  const swap = (exerciseId: string, alt: { id: string; name: string }) =>
    replace.mutate(
      { exerciseId, replacementId: alt.id },
      {
        onSuccess: () => setReplaced((r) => ({ ...r, [exerciseId]: alt.name })),
        onError: (e) => Alert.alert('No se pudo cambiar', e.message),
      },
    );

  return (
    <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
      <Text style={styles.title}>Dolor articular</Text>
      {items.map((p) => (
        <View key={p.exerciseId} style={{ gap: spacing.xs }}>
          <Text style={styles.text}>
            {p.kind === 'warn' && `⚠️ ${p.exerciseName}: revisá la técnica`}
            {p.kind === 'lower_weight' && `↓ ${p.exerciseName}: la próxima, ${p.weightKg} kg`}
            {p.kind === 'swap' && `🔁 ${p.exerciseName}: cambialo`}
          </Text>
          <Text style={styles.muted}>{p.reason}</Text>
          {p.kind === 'swap' && routineId && (replaced[p.exerciseId] ? (
            <Text style={{ color: colors.success, fontWeight: '600' }}>✓ En la rutina ahora va {replaced[p.exerciseId]}.</Text>
          ) : p.alternatives.length === 0 ? (
            <Text style={styles.muted}>No hay otro ejercicio de {MUSCLE_LABELS[p.targetMuscle]} en el catálogo: creá uno en Ejercicios.</Text>
          ) : (
            <Chips
              small
              options={p.alternatives.map((a) => a.id)}
              labels={Object.fromEntries(p.alternatives.map((a) => [a.id, a.name]))}
              value={null}
              onChange={(id) => {
                const alt = p.alternatives.find((a) => a.id === id);
                if (alt && !replace.isPending) swap(p.exerciseId, alt);
              }}
            />
          ))}
        </View>
      ))}
    </Card>
  );
}

/** Qué decidió la app sobre el volumen al terminar el entrenamiento. */
export function ReviewCard({ review }: { review: SessionReviewDto }) {
  const { volumeChanges, pushHarder, deload, growth } = review;
  if (volumeChanges.length === 0 && pushHarder.length === 0 && !deload && growth.length === 0) return null;
  return (
    <Card style={{ gap: spacing.md, borderColor: colors.warning }}>
      <Text style={styles.title}>Ajustes</Text>
      {growth.map((g) => (
        <View key={g.muscle} style={{ gap: 2 }}>
          <Text style={styles.text}>
            📈 {MUSCLE_LABELS[g.muscle]}: +1 serie por semana.{' '}
            {g.kind === 'add_set'
              ? `${g.exerciseName} pasa a ${sets(g.sets)} (${g.routineName}).`
              : `Entra ${g.exerciseName} con ${sets(g.sets)} (${g.routineName}); ${g.from!.exerciseName} queda en ${sets(g.from!.sets)}.`}
          </Text>
          <Text style={styles.muted}>{g.reason}</Text>
        </View>
      ))}
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
