import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, AuthSession } from '../services/api';
import { activateSession } from '../services/session';
import { downloadProfileDocument } from '../services/profileDocument';
import { colors } from '../theme/colors';

export default function LoginScreen({ onSuccess, onGuest, initialError = '' }: { onSuccess: (session: AuthSession) => void | Promise<void>; onGuest: () => void; initialError?: string }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function submit() {
    if (pending.current) return;
    setError('');
    if (!email.trim() || password.length < 12) { setError('Introduce tu correo y una contraseña de al menos 12 caracteres.'); return; }
    if (register && !name.trim()) { setError('Introduce tu nombre.'); return; }
    if (register && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    pending.current = true; setBusy(true);
    let created = false;
    try {
      const session = await (register ? api.auth.register(email.trim(), password, name.trim()) : api.auth.login(email.trim(), password));
      created = register; setRegister(false);
      await activateSession(session);
      setPassword(''); setConfirmation(''); await onSuccess(session);
    } catch (e) { setError((created ? 'Tu cuenta se ha creado. Inicia sesión para reintentar guardar tu plan. ' : '') + (e instanceof Error ? e.message : 'No se pudo iniciar sesión.')); }
    finally { pending.current = false; setBusy(false); }
  }
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><View style={styles.content}>
    <Text style={styles.brand}>SheReady</Text><Text style={styles.eyebrow}>TU PLAN, CONTIGO</Text>
    <Text style={styles.title}>{register ? 'Crea tu cuenta.\nDa el siguiente paso.' : 'Tu próximo paso\nempieza aquí.'}</Text>
    <Text style={styles.copy}>Guarda tu plan, practica entrevistas y encuentra tu progreso cuando vuelvas.</Text>
    <View style={styles.card}>
      {register && <><Text style={styles.label}>Nombre</Text><TextInput accessibilityLabel="Nombre" value={name} onChangeText={setName} editable={!busy} autoCapitalize="words" maxLength={80} style={styles.input} placeholder="Tu nombre" placeholderTextColor={colors.subtleText} /></>}
      <Text style={styles.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" style={styles.input} placeholder="tu@correo.com" placeholderTextColor={colors.subtleText} />
      <Text style={styles.label}>Contraseña</Text><TextInput accessibilityLabel="Contraseña" value={password} onChangeText={setPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} secureTextEntry maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} style={styles.input} placeholder="Al menos 12 caracteres" placeholderTextColor={colors.subtleText} onSubmitEditing={() => { if (!register) void submit(); }} />
      {register && <><Text style={styles.label}>Repite la contraseña</Text><TextInput accessibilityLabel="Repite la contraseña" value={confirmation} onChangeText={setConfirmation} placeholder="Repite tu contraseña" placeholderTextColor={colors.subtleText} editable={!busy} secureTextEntry autoCapitalize="none" maxLength={128} style={styles.input} onSubmitEditing={() => void submit()} /></>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Guardando tu plan…' : register ? 'Crear cuenta  ↗' : 'Iniciar sesión  ↗'}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setRegister(!register); setConfirmation(''); setError(''); }} style={styles.link}><Text style={styles.linkText}>{register ? 'Ya tengo cuenta · Iniciar sesión' : '¿Primera vez? Crea tu cuenta'}</Text></Pressable>
    </View>
    <Pressable accessibilityRole="button" disabled={busy} onPress={onGuest} style={styles.guest}><Text style={styles.linkText}>Entrar como invitada  →</Text></Pressable>
    <Text style={styles.note}>Como invitada puedes explorar la aplicación. Inicia sesión para acceder a las actividades, entrevistas, noticias y tu progreso.</Text>
    {Platform.OS === 'web' && <Pressable accessibilityRole="button" onPress={() => void downloadProfileDocument().catch(e => setError(e.message))} style={styles.link}><Text style={styles.note}>Descargar mi perfil en JSON</Text></Pressable>}
  </View></ScrollView>;
}
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({ page: { flexGrow: 1, backgroundColor: colors.ivory, padding: 26, paddingTop: 48, paddingBottom: 40, justifyContent: 'center', alignItems: 'center' }, content: { width: '100%', maxWidth: 480 }, brand: { fontFamily: serif, color: colors.plum, fontSize: 28, marginBottom: 36 }, eyebrow: { fontSize: 10, letterSpacing: 1.5, color: colors.plum, fontWeight: '700', marginBottom: 12 }, title: { fontFamily: serif, color: colors.eggplant, fontSize: 38, lineHeight: 44 }, copy: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 16, marginBottom: 24 }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 24 }, label: { color: colors.eggplant, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 }, input: { color: colors.eggplant, backgroundColor: colors.ivory, borderWidth: 1, borderColor: colors.border, borderRadius: 12, minHeight: 52, paddingHorizontal: 14, fontSize: 16 }, primary: { backgroundColor: colors.plum, borderRadius: 13, padding: 17, marginTop: 24, alignItems: 'center', minHeight: 54 }, primaryText: { color: colors.white, fontSize: 15, fontWeight: '700' }, link: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 8 }, linkText: { color: colors.plum, fontSize: 14, fontWeight: '600', textAlign: 'center' }, guest: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 20 }, note: { color: colors.mutedText, fontSize: 12, lineHeight: 19, textAlign: 'center' }, error: { color: '#9A3434', lineHeight: 21, marginTop: 16 }, disabled: { opacity: 0.5 } });
