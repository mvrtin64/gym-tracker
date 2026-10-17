import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '../../api/auth';
import { useProfile } from '../../api/hooks';
import { Button, Card, styles } from '../../components/ui';
import { FOCUS_LABELS, LEVEL_LABELS, spacing } from '../../theme';

/** Cuenta, perfil de entrenamiento y cierre de sesión. */
export default function MoreScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: 2 }}>
          <Text style={styles.label}>Cuenta</Text>
          <Text style={styles.title}>{session?.user.name}</Text>
          <Text style={styles.muted}>{session?.user.email}</Text>
        </Card>
        {profile.data && (
          <Card style={{ gap: 2 }}>
            <Text style={styles.label}>Perfil de entrenamiento</Text>
            <Text style={styles.title}>{LEVEL_LABELS[profile.data.level]}</Text>
            <Text style={styles.muted}>
              {profile.data.trainingDays.length} días por semana · {FOCUS_LABELS[profile.data.focus]}
            </Text>
          </Card>
        )}
        <Button title="Editar perfil" variant="secondary" onPress={() => router.push('/onboarding')} />
        <Button title="Cerrar sesión" variant="ghost" onPress={() => void signOut()} />
      </ScrollView>
    </View>
  );
}
