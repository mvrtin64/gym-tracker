import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../api/auth';
import { Button, Field, styles, useSlow, WAKING_UP } from '../components/ui';
import { colors, spacing } from '../theme';

/** Ingreso y registro con email y contraseña; la cuenta nueva confirma el mail con un código de 6 dígitos. */
export default function LoginScreen() {
  const { signIn, signUp, verifyEmail, resendCode } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  /** Email al que se mandó el código: mientras haya uno se muestra el paso de verificación. */
  const [verifying, setVerifying] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const register = mode === 'register';
  const slow = useSlow(pending);

  /** Corre una acción mostrando "Un momento…" y avisa si falla. */
  const run = async (errorTitle: string, action: () => Promise<void>) => {
    setPending(true);
    try {
      await action();
    } catch (e) {
      Alert.alert(errorTitle, (e as Error).message);
    } finally {
      setPending(false);
    }
  };

  const submit = () => {
    if (!email.trim() || !password || (register && !name.trim())) {
      Alert.alert('Faltan datos', register ? 'Completá nombre, email y contraseña.' : 'Completá email y contraseña.');
      return;
    }
    void run(register ? 'No se pudo crear la cuenta' : 'No se pudo ingresar', async () => {
      const pendingEmail = register
        ? await signUp(name.trim(), email.trim(), password)
        : await signIn(email.trim(), password);
      if (pendingEmail) {
        setCode('');
        setVerifying(pendingEmail);
      }
    });
  };

  const verify = () => {
    if (!verifying) return;
    if (code.replace(/\s/g, '').length !== 6) {
      Alert.alert('Código incompleto', 'El código tiene 6 números.');
      return;
    }
    void run('No se pudo verificar', () => verifyEmail(verifying, code));
  };

  const resend = () => {
    if (!verifying) return;
    void run('No se pudo reenviar', async () => {
      await resendCode(verifying);
      Alert.alert('Código enviado', `Te mandamos otro código a ${verifying}.`);
    });
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

            {verifying ? (
              <>
                <Text style={styles.muted}>
                  Te mandamos un código de 6 números a {verifying}. Si no lo ves, fijate en spam.
                </Text>
                <Field
                  label="Código"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={7}
                  onSubmitEditing={verify}
                />
                <Button title={pending ? 'Un momento…' : 'Verificar'} onPress={verify} disabled={pending} />
                {slow && <Text style={[styles.muted, { textAlign: 'center' }]}>{WAKING_UP}</Text>}
                <Pressable onPress={resend} disabled={pending} style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.accent, paddingVertical: spacing.sm }}>Reenviar código</Text>
                </Pressable>
                <Pressable onPress={() => setVerifying(null)} style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.muted, paddingVertical: spacing.sm }}>Volver</Text>
                </Pressable>
              </>
            ) : (
              <>
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
                {slow && <Text style={[styles.muted, { textAlign: 'center' }]}>{WAKING_UP}</Text>}
                <Pressable onPress={() => setMode(register ? 'login' : 'register')} style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.accent, paddingVertical: spacing.sm }}>
                    {register ? 'Ya tengo cuenta: ingresar' : '¿No tenés cuenta? Creala'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
