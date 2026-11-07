import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import AppShell from './src/navigation/AppShell';
import { api, AuthSession } from './src/services/api';
import { endSession, restoreSession, syncPendingProfile, enterGuestSession } from './src/services/session';
import { ProfileDocument, pendingProfileDocument, saveProfileDocument } from './src/services/profileDocument';
import GettingStartedScreen from './src/features/gettingStarted/GettingStartedScreen';
import { emptyGettingStarted, GettingStarted, loadGettingStarted, saveGettingStarted, TargetRole } from './src/features/gettingStarted/model';
import { colors } from './src/theme/colors';

type Stage = 'launch' | 'onboarding' | 'login' | 'invitation' | 'interview' | 'roleInvitation' | 'role' | 'app';
export default function App() {
  const [stage, setStage] = useState<Stage>('launch');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [completedOnboarding, setCompletedOnboarding] = useState(false);
  const [returnToProfile, setReturnToProfile] = useState(false);
  const [sector, setSector] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<GettingStarted>(emptyGettingStarted);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const refreshGettingStarted = async () => { const value = await loadGettingStarted(); setData(value); return value; };
  const nextAfterOnboarding = (value: GettingStarted) => value.initialAnswers ? (value.targetRole ? 'app' : 'roleInvitation') : 'invitation';
  const saveAnswers = async (answers: string[]) => { const next = { ...data, initialAnswers: answers }; await saveGettingStarted(next); setData(next); setStage(next.targetRole ? 'app' : 'roleInvitation'); };
  const saveRole = async (role: TargetRole) => { const next = { ...data, targetRole: role }; await saveGettingStarted(next); setData(next); setStage('app'); };
  useEffect(() => { void (async () => {
    try {
      const restored = await restoreSession();
      const pending = await pendingProfileDocument();
      if (pending) { setSector(pending.sector ?? ''); setCompletedOnboarding(pending.completed); }
      if (restored) {
        setSession(restored);
        const profile = await api.profile.get().catch(() => null);
        if (profile) { setSector(profile.sector ?? ''); setCompletedOnboarding(profile.onboarding_document?.completed ?? Boolean(profile.target_role)); }
      }
    } catch { setError('No se pudo recuperar tu sesión. Puedes volver a entrar; tu plan pendiente se conserva.'); }
    try { await refreshGettingStarted(); setLoadError(false); setLoaded(true); } catch { setLoadError(true); }
  })(); }, [retry]);
  async function finishOnboarding(document: ProfileDocument) {
    if (!document.completed && session) { setStage('app'); return; }
    const previous = await pendingProfileDocument();
    if (document.completed || !previous) await saveProfileDocument(document);
    const current = document.completed || !previous ? document : previous;
    setSector(current.sector ?? ''); setCompletedOnboarding(current.completed);
    if (session) { await syncPendingProfile(); setStage(document.completed && !returnToProfile ? nextAfterOnboarding(data) : 'app'); }
    else setStage('login');
  }
  async function signedIn(value: AuthSession) {
    const profile = await api.profile.get().catch(() => null);
    setSector(profile?.sector ?? ''); setCompletedOnboarding(profile?.onboarding_document?.completed ?? Boolean(profile?.target_role));
    const next = await refreshGettingStarted();
    setSession(value); setError(''); setStage(profile ? (profile.onboarding_document?.completed && !returnToProfile ? nextAfterOnboarding(next) : 'app') : 'onboarding');
  }
  async function guest() {
    try {
      await enterGuestSession();
      const pending = await pendingProfileDocument();
      setSector(pending?.sector ?? ''); setCompletedOnboarding(pending?.completed ?? false);
      const next = await refreshGettingStarted();
      setSession(null); setError(''); setReturnToProfile(false); setStage(pending?.completed ? nextAfterOnboarding(next) : 'app');
    } catch { setError('No se pudo preparar el acceso como invitada. Inténtalo de nuevo.'); }
  }
  async function logout() {
    try { await endSession(); setSession(null); setReturnToProfile(false); setStage('login'); }
    catch { setError('No se pudo cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.'); setStage('login'); }
  }
  if (!loaded) return <View style={styles.loading}>{loadError ? <><Text accessibilityRole="alert" style={styles.error}>No se han podido cargar tus datos. Inténtalo de nuevo.</Text><Pressable accessibilityRole="button" onPress={() => setRetry(retry + 1)} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable></> : <ActivityIndicator color={colors.plum} />}</View>;
  if (stage === 'launch') return <LaunchScreen onFinish={() => setStage('onboarding')} />;
  if (stage === 'onboarding') return <OnboardingScreen startAtForm={returnToProfile} onComplete={finishOnboarding} onSkip={finishOnboarding} />;
  if (stage === 'login') return <LoginScreen initialError={error} onSuccess={signedIn} onGuest={() => void guest()} />;
  if (stage !== 'app') return <GettingStartedScreen key={stage === 'invitation' || stage === 'interview' ? 'initial' : 'target'} stage={stage} selectedSector={sector} initialAnswers={data.initialAnswers} targetRole={data.targetRole} onStage={setStage} onAnswers={saveAnswers} onRole={saveRole} onLater={() => { if ((stage === 'invitation' || stage === 'interview') && !returnToProfile && !data.targetRole) setStage('roleInvitation'); else setStage('app'); }} onBack={() => setStage(stage === 'role' ? 'roleInvitation' : 'invitation')} />;
  return <AppShell initialInterviewCompleted={!!data.initialAnswers} targetRole={data.targetRole} onOpenInitialInterview={() => { setReturnToProfile(true); setStage('invitation'); }} onOpenTargetRole={() => { setReturnToProfile(true); setStage('roleInvitation'); }} key={session?.user.id ?? 'guest'} selectedSector={sector} initialRoute={returnToProfile ? 'profile' : 'home'} completedOnboarding={completedOnboarding} accountEmail={session?.user.email} onLogin={() => { setError(''); setStage('login'); }} onLogout={() => void logout()} onOpenOnboarding={() => { setReturnToProfile(true); setStage('onboarding'); }} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory, padding: 24 }, error: { color: colors.eggplant, textAlign: 'center', fontSize: 15 }, retry: { marginTop: 20, backgroundColor: colors.plum, padding: 16, borderRadius: 12 }, retryText: { color: colors.white, fontWeight: '700' } });
