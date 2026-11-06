import { useState } from 'react';
import LaunchScreen from './src/screens/LaunchScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AppShell from './src/navigation/AppShell';

export default function App() {
  const [stage, setStage] = useState<'launch' | 'onboarding' | 'app'>('launch');
  if (stage === 'launch') return <LaunchScreen onFinish={() => setStage('onboarding')} />;
  if (stage === 'onboarding') return <OnboardingScreen onComplete={() => setStage('app')} />;
  return <AppShell />;
}
