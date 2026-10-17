import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';
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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
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
          <Text style={{ color: colors.accent }}>{register ? 'Ya tengo cuenta: ingresar' : '¿No tenés cuenta? Creala'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
