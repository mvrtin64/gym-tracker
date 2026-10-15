import {
  FOCUSES, LEVELS, MAX_TRAINING_DAYS, MUSCLES, muscleRecord, WEEKDAYS, type Focus, type Level, type Muscle, type Weekday,
} from '@gym/domain';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useProfile, useSaveProfile } from '../api/hooks';
import type { ProfileInput } from '../api/types';
import { Button, Card, Chips, Field, MultiChips, QueryState, Section, Stepper, styles } from '../components/ui';
import { FOCUS_LABELS, LEVEL_LABELS, MUSCLE_LABELS, spacing, WEEKDAY_LABELS } from '../theme';

/** Valor de arranque de cada músculo en el formulario; el usuario lo ajusta a lo que hace hoy. */
const STARTING_REPORTED_SETS = 8;

const byWeekOrder = (days: Weekday[]) => [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));

/** Onboarding (docs/dominio.md §2). También sirve para editar el perfil. */
export default function OnboardingScreen() {
  const profile = useProfile();
  const save = useSaveProfile();
  // El volumen se pregunta solo la primera vez: después se ajusta desde la semana, no desde el perfil.
  const firstTime = profile.data === null;

  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState<Weekday[]>([]);
  const [focus, setFocus] = useState<Focus>('general');
  const [priority, setPriority] = useState<Muscle[]>([]);
  const [repMin, setRepMin] = useState('');
  const [repMax, setRepMax] = useState('');
  const [volume, setVolume] = useState(() => muscleRecord(STARTING_REPORTED_SETS));

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setLevel(p.level);
    setDays(p.trainingDays);
    setFocus(p.focus);
    setPriority(p.priorityMuscles);
    setRepMin(p.preferredRepMin?.toString() ?? '');
    setRepMax(p.preferredRepMax?.toString() ?? '');
  }, [profile.data]);

  const experienced = level === 'intermediate' || level === 'advanced';

  const changeDays = (next: Weekday[]) => {
    if (next.length > MAX_TRAINING_DAYS) {
      Alert.alert('Máximo 6 días', 'Dejá al menos un día de descanso en la semana.');
      return;
    }
    setDays(next);
  };

  const submit = () => {
    if (!level || days.length === 0) {
      Alert.alert('Faltan datos', 'Elegí tu nivel y qué días entrenás.');
      return;
    }
    const body: ProfileInput = { level, trainingDays: byWeekOrder(days) };
    if (experienced) {
      if (focus === 'specific' && priority.length === 0) {
        Alert.alert('Faltan músculos', 'Con enfoque en músculos específicos, elegí cuáles querés priorizar.');
        return;
      }
      const hasRange = repMin.trim() !== '' || repMax.trim() !== '';
      const min = Number(repMin);
      const max = Number(repMax);
      if (hasRange && !(Number.isInteger(min) && Number.isInteger(max) && min >= 1 && max >= min)) {
        Alert.alert('Revisá el rango', 'Poné mínimo y máximo de repeticiones (ej. 6 y 10), o dejá los dos vacíos.');
        return;
      }
      Object.assign(body, {
        focus,
        priorityMuscles: priority,
        ...(hasRange && { preferredRepMin: min, preferredRepMax: max }),
        ...(firstTime && { reportedVolume: MUSCLES.map((muscle) => ({ muscle, weeklySets: volume[muscle] })) }),
      });
    }
    save.mutate(body, { onSuccess: () => router.replace('/'), onError: (e) => Alert.alert('No se guardó', e.message) });
  };

  if (profile.isLoading || profile.error) {
    return (
      <View style={styles.screen}>
        <QueryState isLoading={profile.isLoading} error={profile.error} onRetry={profile.refetch} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }} keyboardShouldPersistTaps="handled">
      {firstTime && (
        <Text style={styles.muted}>Unas preguntas para armar tu punto de partida. Después todo se ajusta según cómo rindas.</Text>
      )}

      <Section title="Tu nivel">
        <Chips options={LEVELS} value={level} onChange={(v) => v && setLevel(v)} labels={LEVEL_LABELS} />
        {level === 'beginner' && (
          <Text style={styles.muted}>
            Vas a arrancar con más series por semana: así aprendés técnica y a acercarte al fallo. Entrenás todo por igual.
          </Text>
        )}
        {experienced && (
          <Text style={styles.muted}>La app respeta cómo ya entrenás: contanos cómo te manejás y desde ahí te acompaña.</Text>
        )}
      </Section>

      <Section title="Qué días entrenás" hint="Hasta 6. Un mismo músculo no se repite en días seguidos.">
        <MultiChips options={WEEKDAYS} value={days} onChange={changeDays} labels={WEEKDAY_LABELS} />
      </Section>

      {experienced && (
        <>
          <Section title="Enfoque">
            <Chips options={FOCUSES} value={focus} onChange={(v) => v && setFocus(v)} labels={FOCUS_LABELS} />
          </Section>

          <Section title="Músculos a priorizar" hint="Rezagados o los que más te importan: van 3 veces por semana si tus días lo permiten.">
            <MultiChips options={MUSCLES} value={priority} onChange={setPriority} labels={MUSCLE_LABELS} />
          </Section>

          <Section title="Rango de repeticiones con el que te sentís cómodo" hint="Opcional.">
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Field label="Mínimo" keyboardType="number-pad" value={repMin} onChangeText={setRepMin} placeholder="6" />
              <Field label="Máximo" keyboardType="number-pad" value={repMax} onChangeText={setRepMax} placeholder="10" />
            </View>
          </Section>

          {firstTime && (
            <Section title="Tu volumen actual" hint="Series efectivas por semana de cada músculo, sin calentamientos ni trabajo indirecto.">
              <Card style={{ gap: spacing.sm }}>
                {MUSCLES.map((m) => (
                  <View key={m} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.text}>{MUSCLE_LABELS[m]}</Text>
                    <Stepper value={volume[m]} onChange={(v) => setVolume((cur) => ({ ...cur, [m]: v }))} />
                  </View>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}

      <Button title={save.isPending ? 'Guardando…' : firstTime ? 'Empezar' : 'Guardar'} onPress={submit} disabled={save.isPending} />
    </ScrollView>
  );
}
