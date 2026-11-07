import { useEffect, useState } from 'react';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import AppShell from './src/navigation/AppShell';
import { api, AuthSession } from './src/services/api';
import { endSession, restoreSession, syncPendingProfile, enterGuestSession } from './src/services/session';
import { ProfileDocument, pendingProfileDocument, saveProfileDocument } from './src/services/profileDocument';

export default function App() {
  const [stage, setStage] = useState<'launch' | 'onboarding' | 'login' | 'app'>('launch');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [completedOnboarding, setCompletedOnboarding] = useState(false);
  const [returnToProfile, setReturnToProfile] = useState(false);
  const [sector, setSector] = useState('');
  const [error, setError] = useState('');
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
  })(); }, []);
  async function finishOnboarding(document: ProfileDocument) {
    if (!document.completed && session) { setStage('app'); return; }
    const previous = await pendingProfileDocument();
    if (document.completed || !previous) await saveProfileDocument(document);
    const current = document.completed || !previous ? document : previous;
    setSector(current.sector ?? ''); setCompletedOnboarding(current.completed);
    if (session) { await syncPendingProfile(); setStage('app'); }
    else setStage('login');
  }
  async function signedIn(value: AuthSession) {
    const profile = await api.profile.get().catch(() => null);
    setSector(profile?.sector ?? ''); setCompletedOnboarding(profile?.onboarding_document?.completed ?? Boolean(profile?.target_role));
    setSession(value); setError(''); setStage(profile ? 'app' : 'onboarding');
  }
  async function guest() {
    try {
      await enterGuestSession();
      const pending = await pendingProfileDocument();
      setSector(pending?.sector ?? ''); setCompletedOnboarding(pending?.completed ?? false);
      setSession(null); setError(''); setReturnToProfile(false); setStage('app');
    } catch { setError('No se pudo preparar el acceso como invitada. Inténtalo de nuevo.'); }
  }
  async function logout() {
    try { await endSession(); setSession(null); setReturnToProfile(false); setStage('login'); }
    catch { setError('No se pudo cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.'); setStage('login'); }
  }
  if (stage === 'launch') return <LaunchScreen onFinish={() => setStage('onboarding')} />;
  if (stage === 'onboarding') return <OnboardingScreen startAtForm={returnToProfile} onComplete={finishOnboarding} onSkip={finishOnboarding} />;
  if (stage === 'login') return <LoginScreen initialError={error} onSuccess={signedIn} onGuest={() => void guest()} />;
  return <AppShell key={session?.user.id ?? 'guest'} selectedSector={sector} initialRoute={returnToProfile ? 'profile' : 'home'} completedOnboarding={completedOnboarding} accountEmail={session?.user.email} onLogin={() => { setError(''); setStage('login'); }} onLogout={() => void logout()} onOpenOnboarding={() => { setReturnToProfile(true); setStage('onboarding'); }} />;
}
