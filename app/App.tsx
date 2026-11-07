import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppShell from './src/navigation/AppShell';
import GettingStartedScreen from './src/features/gettingStarted/GettingStartedScreen';
import { emptyGettingStarted, GettingStarted, loadGettingStarted, saveGettingStarted, TargetRole } from './src/features/gettingStarted/model';
import { colors } from './src/theme/colors';

type Stage = 'launch' | 'onboarding' | 'invitation' | 'interview' | 'roleInvitation' | 'role' | 'app';
export default function App() {
  const [stage, setStage] = useState<Stage>('launch');
  const [completedOnboarding, setCompletedOnboarding] = useState(false);
  const [returnToProfile, setReturnToProfile] = useState(false);
  const [sector, setSector] = useState('');
  const [data, setData] = useState<GettingStarted>(emptyGettingStarted);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setLoadError(false); loadGettingStarted().then(result => { if (active) { setData(result); setLoaded(true); } }).catch(() => { if (active) setLoadError(true); }); return () => { active = false; }; }, [retry]);
  const returnToApp = () => setStage('app');
  const saveAnswers = async (answers: string[]) => {
    const next = { ...data, initialAnswers: answers }; await saveGettingStarted(next); setData(next);
    setStage(next.targetRole ? 'app' : 'roleInvitation');
  };
  const saveRole = async (role: TargetRole) => { const next = { ...data, targetRole: role }; await saveGettingStarted(next); setData(next); returnToApp(); };
  if (!loaded) return <View style={styles.loading}>{loadError ? <><Text accessibilityRole="alert" style={styles.error}>No se han podido cargar tus datos. Inténtalo de nuevo.</Text><Pressable accessibilityRole="button" onPress={() => setRetry(retry + 1)} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable></> : <ActivityIndicator color={colors.plum} />}</View>;
  if (stage === 'launch') return <LaunchScreen onFinish={() => setStage('onboarding')} />;
  if (stage === 'onboarding') return <OnboardingScreen startAtForm={returnToProfile} onComplete={selectedSector => { setSector(selectedSector); setCompletedOnboarding(true); if (data.initialAnswers && data.targetRole) returnToApp(); else if (!data.initialAnswers) setStage('invitation'); else setStage('roleInvitation'); }} onSkip={selectedSector => { if (selectedSector) setSector(selectedSector); returnToApp(); }} />;
  if (stage !== 'app') return <GettingStartedScreen key={stage === 'invitation' || stage === 'interview' ? 'initial' : 'target'} stage={stage} selectedSector={sector} initialAnswers={data.initialAnswers} targetRole={data.targetRole} onStage={setStage} onAnswers={saveAnswers} onRole={saveRole} onLater={() => { if ((stage === 'invitation' || stage === 'interview') && !returnToProfile && !data.targetRole) setStage('roleInvitation'); else returnToApp(); }} onBack={() => setStage(stage === 'role' ? 'roleInvitation' : 'invitation')} />;
  return <AppShell selectedSector={sector} initialRoute={returnToProfile ? 'profile' : 'home'} completedOnboarding={completedOnboarding} initialInterviewCompleted={!!data.initialAnswers} targetRole={data.targetRole} onOpenInitialInterview={() => { setReturnToProfile(true); setStage('invitation'); }} onOpenTargetRole={() => { setReturnToProfile(true); setStage('roleInvitation'); }} onOpenOnboarding={() => { setReturnToProfile(true); setStage('onboarding'); }} />;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory, padding: 24 }, error: { color: colors.eggplant, textAlign: 'center', fontSize: 15 }, retry: { marginTop: 20, backgroundColor: colors.plum, padding: 16, borderRadius: 12 }, retryText: { color: colors.white, fontWeight: '700' } });
