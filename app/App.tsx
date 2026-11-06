import { useState } from 'react';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppShell from './src/navigation/AppShell';

export default function App() {
  const [stage, setStage] = useState<'launch' | 'onboarding' | 'app'>('launch');
  const [completedOnboarding, setCompletedOnboarding] = useState(false);
  const [returnToProfile, setReturnToProfile] = useState(false);
  const [sector, setSector] = useState('');
  if (stage === 'launch') return <LaunchScreen onFinish={() => setStage('onboarding')} />;
  if (stage === 'onboarding') return <OnboardingScreen startAtForm={returnToProfile} onComplete={selectedSector => { setSector(selectedSector); setCompletedOnboarding(true); setStage('app'); }} onSkip={() => setStage('app')} />;
  return <AppShell selectedSector={sector} initialRoute={returnToProfile ? 'profile' : 'home'} completedOnboarding={completedOnboarding} onOpenOnboarding={() => { setReturnToProfile(true); setStage('onboarding'); }} />;
}
