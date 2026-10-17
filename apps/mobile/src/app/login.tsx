import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../api/auth';
import { Button, Field, styles } from '../components/ui';
import { colors, spacing } from '../theme';

/** Ingreso y registro con email y contraseña. */
export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const register = mode === 'register';

  const submit = async () => {
    if (!email.trim() || !password || (register && !name.trim())) {
      Alert.alert('Faltan datos', register ? 'Completá nombre, email y contraseña.' : 'Completá email y contraseña.');
      return;
    }
    setPending(true);
    try {
      if (register) await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert(register ? 'No se pudo crear la cuenta' : 'No se pudo ingresar', (e as Error).message);
    } finally {
      setPending(false);
    }
  };

  // Sin encabezado: SafeAreaView deja lugar a la barra de estado y a los botones del sistema.
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}
          keyboardShouldPersistTaps="handled">
          {/* View sin flex: los Field tienen flex 1 (para usarlos en fila) y si no se estirarían a lo alto. */}
          <View style={{ gap: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>Gym Tracker</Text>
            <Text style={styles.muted}>
              {register ? 'Creá tu cuenta para guardar tus entrenamientos.' : 'Ingresá para seguir con tus entrenamientos.'}
            </Text>

            {register && <Field label="Nombre" value={name} onChangeText={setName} autoComplete="name" />}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={register ? 'new-password' : 'current-password'}
              placeholder={register ? 'Al menos 8 caracteres' : undefined}
              onSubmitEditing={submit}
            />

            <Button title={pending ? 'Un momento…' : register ? 'Crear cuenta' : 'Ingresar'} onPress={submit} disabled={pending} />
            <Pressable onPress={() => setMode(register ? 'login' : 'register')} style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.accent, paddingVertical: spacing.sm }}>
                {register ? 'Ya tengo cuenta: ingresar' : '¿No tenés cuenta? Creala'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
