import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import AppShell from './src/navigation/AppShell';
import { api, ApiError, AuthSession, RolePlan } from './src/services/api';
import { endSession, restoreSession, syncPendingProfile, enterGuestSession, deleteAccount } from './src/services/session';
import { ProfileDocument, pendingProfileDocument, saveProfileDocument } from './src/services/profileDocument';
import GettingStartedScreen from './src/features/gettingStarted/GettingStartedScreen';
import { emptyGettingStarted, GettingStarted, loadGettingStarted, saveGettingStarted, TargetRole } from './src/features/gettingStarted/model';
import { colors } from './src/theme/colors';

type Stage = 'launch' | 'onboarding' | 'login' | 'invitation' | 'interview' | 'roleInvitation' | 'role' | 'app';
export default function App() {
  const [stage, setStage] = useState<Stage>('launch');
  const logoutPending = useRef(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [completedOnboarding, setCompletedOnboarding] = useState(false);
  const [onboardingDocument, setOnboardingDocument] = useState<ProfileDocument | null>(null);
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [returnToProfile, setReturnToProfile] = useState(false);
  const [sector, setSector] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<GettingStarted>(emptyGettingStarted);
  const [rolePlans, setRolePlans] = useState<RolePlan[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const refreshGettingStarted = async (authenticated = false) => {
    const local = await loadGettingStarted();
    if (!authenticated) { setRolePlans([]); setData(local); return local; }
    let [initial, plans] = await Promise.all([api.profile.initialInterview(), api.rolePlans.list()]);
    if (!initial.completed && local.initialAnswers) {
      await api.profile.saveInitialInterview(local.initialAnswers);
      initial = await api.profile.initialInterview();
    }
    setRolePlans(plans.items);
    const latest = plans.items.find(item => item.status === 'ready' && item.id === local.activePlanId) ?? plans.items.find(item => item.status === 'ready');
    const value: GettingStarted = { initialAnswers: initial.answers, targetRole: latest ? { role: latest.role.title, company: latest.role.company, offerUrl: latest.role.offer_url, description: latest.role.offer_description } : local.targetRole, activePlanId: latest?.id ?? null };
    await saveGettingStarted(value); setData(value); return value;
  };
  const nextAfterOnboarding = (value: GettingStarted) => value.initialAnswers ? (value.targetRole ? 'app' : 'roleInvitation') : 'invitation';
  const saveAnswers = async (answers: string[]) => { await api.profile.saveInitialInterview(answers); const next = { ...data, initialAnswers: answers }; await saveGettingStarted(next); setData(next); setStage(next.targetRole ? 'app' : 'roleInvitation'); };
  const saveRole = async (role: TargetRole) => { const plan = await api.rolePlans.generate({ title: role.role, sector: sector || 'Otro sector', company: role.company, offer_url: role.offerUrl, offer_description: role.description }); setRolePlans((await api.rolePlans.list()).items); const next = { ...data, targetRole: role, activePlanId: plan.id }; await saveGettingStarted(next); setData(next); setStage('app'); };
  const selectPlan = async (plan: RolePlan) => { const role = plan.role; const next = { ...data, activePlanId: plan.id, targetRole: { role: role.title, company: role.company, offerUrl: role.offer_url, description: role.offer_description } }; await saveGettingStarted(next); setData(next); };
  useEffect(() => { void (async () => {
    let authenticated = false;
    try {
      const restored = await restoreSession();
      authenticated = !!restored;
      const pending = await pendingProfileDocument();
      if (pending) { setSector(pending.sector ?? ''); setCompletedOnboarding(pending.completed); }
      if (restored) {
        setSession(restored);
        const profile = await api.profile.get().catch(() => null);
        if (profile) { setSector(profile.sector ?? ''); setOnboardingDocument(profile.onboarding_document ?? null); setCompletedOnboarding(profile.onboarding_document?.completed ?? Boolean(profile.target_role)); }
      }
    } catch { setError('No se pudo recuperar tu sesión. Puedes volver a entrar; tu plan pendiente se conserva.'); setStage('login'); }
    try { await refreshGettingStarted(authenticated); setLoadError(false); setLoaded(true); } catch { setLoadError(true); }
  })(); }, [retry]);
  async function finishOnboarding(document: ProfileDocument) {
    if (editingOnboarding && session) {
      const profile = await api.profile.saveOnboarding(document);
      setOnboardingDocument(profile.onboarding_document ?? document);
      setSector(profile.sector ?? document.sector ?? '');
      setCompletedOnboarding(document.completed);
      setEditingOnboarding(false);
      setStage('app');
      return;
    }
    if (!document.completed && session) { setStage('app'); return; }
    const previous = await pendingProfileDocument();
    if (document.completed || !previous) await saveProfileDocument(document);
    const current = document.completed || !previous ? document : previous;
    setSector(current.sector ?? ''); setCompletedOnboarding(current.completed);
    if (session) { await syncPendingProfile(); setOnboardingDocument(current); setStage(document.completed && !returnToProfile ? nextAfterOnboarding(data) : 'app'); }
    else setStage('login');
  }
  async function signedIn(value: AuthSession) {
    const profile = await api.profile.get().catch(() => null);
    setSector(profile?.sector ?? ''); setOnboardingDocument(profile?.onboarding_document ?? null); setCompletedOnboarding(profile?.onboarding_document?.completed ?? Boolean(profile?.target_role));
    const next = await refreshGettingStarted(true);
    setSession(value); setError(''); setStage(next.initialAnswers ? 'app' : 'invitation');
  }
  async function guest() {
    try {
      await enterGuestSession();
      const pending = await pendingProfileDocument();
      setSector(pending?.sector ?? ''); setCompletedOnboarding(pending?.completed ?? false);
      await refreshGettingStarted();
      setSession(null); setError(''); setReturnToProfile(false); setStage('app');
    } catch { setError('No se pudo preparar el acceso como invitada. Inténtalo de nuevo.'); }
  }
  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    try { const revoked = await endSession(); setSession(null); setOnboardingDocument(null); setData(emptyGettingStarted); setRolePlans([]); setReturnToProfile(false); setError(revoked ? '' : 'Has cerrado sesión en este dispositivo, pero no se ha podido confirmar el cierre en el servidor.'); setStage('login'); }
    catch { setError('No se ha podido cerrar la sesión en este dispositivo.'); setStage('login'); }
    finally { logoutPending.current = false; }
  }
  async function removeAccount(password: string) {
    const cleared = await deleteAccount(password);
    setSession(null); setOnboardingDocument(null); setData(emptyGettingStarted); setRolePlans([]); setReturnToProfile(false);
    setError(cleared ? 'Tu cuenta se ha eliminado.' : 'Tu cuenta se ha eliminado, pero no se han podido borrar todos los datos de este dispositivo.');
    setStage('login');
  }
  async function openOnboardingEditor() {
    try {
      const profile = await api.profile.get();
      setOnboardingDocument(profile.onboarding_document ?? null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setOnboardingDocument(null);
      else throw error;
    }
    setReturnToProfile(true); setEditingOnboarding(true); setStage('onboarding');
  }
  if (!loaded) return <View style={styles.loading}>{loadError ? <><Text accessibilityRole="alert" style={styles.error}>No se han podido cargar tus datos. Inténtalo de nuevo.</Text><Pressable accessibilityRole="button" onPress={() => setRetry(retry + 1)} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable></> : <ActivityIndicator color={colors.plum} />}</View>;
  if (stage === 'launch') return <LaunchScreen onFinish={() => setStage(session ? 'app' : 'onboarding')} />;
  if (stage === 'onboarding') return <OnboardingScreen startAtForm={returnToProfile} initialDocument={editingOnboarding ? onboardingDocument : null} onCancel={editingOnboarding ? () => { setEditingOnboarding(false); setStage('app'); } : undefined} onComplete={finishOnboarding} onSkip={finishOnboarding} />;
  if (stage === 'login') return <LoginScreen initialError={error} onSuccess={signedIn} onGuest={() => void guest()} />;
  if (stage !== 'app') return <GettingStartedScreen key={stage === 'invitation' || stage === 'interview' ? 'initial' : 'target'} stage={stage} selectedSector={sector} initialAnswers={data.initialAnswers} targetRole={data.targetRole} onStage={setStage} onAnswers={saveAnswers} onRole={saveRole} onLater={() => { if ((stage === 'invitation' || stage === 'interview') && !data.initialAnswers) setStage('app'); else if ((stage === 'invitation' || stage === 'interview') && !returnToProfile && !data.targetRole) setStage('roleInvitation'); else setStage('app'); }} onBack={() => setStage(stage === 'role' ? 'roleInvitation' : 'invitation')} />;
  return <AppShell accountName={session?.user.display_name} onboardingDocument={onboardingDocument} onOpenOnboarding={openOnboardingEditor} onDeleteAccount={removeAccount} rolePlans={rolePlans} onSelectPlan={selectPlan} activePlanId={data.activePlanId ?? null} initialInterviewCompleted={!!data.initialAnswers} targetRole={data.targetRole} onOpenInitialInterview={() => { setReturnToProfile(true); setStage('invitation'); }} onOpenTargetRole={() => { setReturnToProfile(true); setStage('roleInvitation'); }} key={session?.user.id ?? 'guest'} selectedSector={sector} initialRoute={returnToProfile ? 'profile' : 'home'} completedOnboarding={completedOnboarding} accountEmail={session?.user.email} onLogin={() => { setError(''); setStage('login'); }} onLogout={() => void logout()} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory, padding: 24 }, error: { color: colors.eggplant, textAlign: 'center', fontSize: 15 }, retry: { marginTop: 20, backgroundColor: colors.plum, padding: 16, borderRadius: 12 }, retryText: { color: colors.white, fontWeight: '700' } });
