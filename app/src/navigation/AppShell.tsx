import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import VoiceInterviewScreen from '../screens/VoiceInterviewScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NewsScreen from '../screens/NewsScreen';
import { colors } from '../theme/colors';

type Route = 'home' | 'practice' | 'activities' | 'news' | 'profile';
const tabs: { id: Route; label: string }[] = [
  { id: 'home', label: 'Inicio' }, { id: 'practice', label: 'Entrevista' }, { id: 'activities', label: 'Actividades' }, { id: 'news', label: 'Actualidad' }, { id: 'profile', label: 'Mi perfil' },
];
function Icon({ name, active }: { name: Route; active: boolean }) {
  const color = active ? colors.plum : colors.mutedText;
  return <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {name === 'home' && <><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>}
    {name === 'practice' && <><Rect x="8" y="3" width="8" height="12" rx="4" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6" /></>}
    {name === 'activities' && <><Circle cx="12" cy="12" r="8" /><Path d="M8 13c1-3 3-4 4-4s3 1 4 4M9 16h6" /></>}
    {name === 'news' && <><Rect x="3" y="4" width="18" height="16" rx="2" /><Path d="M7 8h4v4H7zM14 8h3M14 11h3M7 16h10" /></>}
    {name === 'profile' && <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>}
  </Svg>;
}
export default function AppShell({ initialRoute = 'home', selectedSector, completedOnboarding, onOpenOnboarding, accountEmail, onLogin, onLogout }: { initialRoute?: 'home' | 'profile'; selectedSector?: string; completedOnboarding: boolean; onOpenOnboarding: () => void; accountEmail?: string; onLogin: () => void; onLogout: () => void }) {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [sessionActive, setSessionActive] = useState(false);
  const [activityTarget, setActivityTarget] = useState<'list' | 'instructions' | 'confidence'>('list');
  const [activityKey, setActivityKey] = useState(0);
  const [profileKey, setProfileKey] = useState(0);
  const openProfile = () => { setProfileKey(key => key + 1); setRoute('profile'); };
  const openActivities = (target: 'list' | 'instructions' | 'confidence' = 'list') => { setActivityTarget(target); setActivityKey(key => key + 1); setRoute('activities'); };
  const wide = useWindowDimensions().width >= 1050;
  const navigation = <View style={[styles.nav, wide ? styles.navWide : styles.navMobile]}>{wide && <Text style={styles.brand}>SheReady</Text>}{tabs.map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: route === tab.id }} onPress={() => tab.id === 'practice' && !accountEmail ? onLogin() : tab.id === 'activities' ? openActivities() : tab.id === 'profile' ? openProfile() : setRoute(tab.id)} style={[styles.navItem, wide && styles.navItemWide, route === tab.id && styles.navActive]}><Icon name={tab.id} active={route === tab.id} />{wide && <Text style={[styles.navText, route === tab.id && styles.navTextActive]}>{tab.label}</Text>}</Pressable>)}</View>;
  return <View style={styles.root}><StatusBar style="dark" />{wide && !sessionActive && navigation}{!sessionActive && <View style={{ paddingHorizontal: 24, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.ivory }}><Text style={{ color: colors.mutedText, fontSize: 12, flexShrink: 1 }}>{accountEmail ?? 'Invitada · datos guardados en este dispositivo'}</Text><Pressable accessibilityRole="button" onPress={accountEmail ? onLogout : onLogin} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}><Text style={{ color: colors.plum, fontWeight: '600', fontSize: 12 }}>{accountEmail ? 'Cerrar sesión' : 'Iniciar sesión'}</Text></Pressable></View>}<View style={styles.main}>{route === 'home' ? <HomeScreen selectedSector={selectedSector} onInterview={() => accountEmail ? setRoute('practice') : onLogin()} onActivity={openActivities} onActivities={() => openActivities()} /> : route === 'practice' ? <VoiceInterviewScreen selectedSector={selectedSector} onSessionChange={setSessionActive} onRealInterviews={openProfile} /> : route === 'activities' ? <ActivitiesScreen key={activityKey} initialScreen={activityTarget} onSessionChange={setSessionActive} /> : route === 'news' ? <NewsScreen initialSector={selectedSector} /> : route === 'profile' ? <ProfileScreen key={profileKey} completedOnboarding={completedOnboarding} onOpenOnboarding={onOpenOnboarding} onMeditation={() => openActivities('instructions')} /> : <View style={styles.placeholder}><Text style={styles.placeholderEyebrow}>SHEREADY</Text><Text style={styles.placeholderTitle}>{tabs.find(tab => tab.id === route)?.label}</Text><Text style={styles.placeholderText}>Esta sección estará disponible próximamente.</Text><Pressable accessibilityRole="button" onPress={() => setRoute('practice')} style={styles.placeholderButton}><Text style={styles.placeholderButtonText}>Ir a la entrevista  ↗</Text></Pressable></View>}</View>{!wide && !sessionActive && navigation}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.ivory, paddingTop: Platform.OS === 'ios' ? 48 : 0 }, main: { flex: 1 }, nav: { backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', borderColor: colors.border }, navWide: { minHeight: 82, paddingHorizontal: 48, borderBottomWidth: 1, gap: 5 }, navMobile: { borderTopWidth: 1, minHeight: 72, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 22 : 10, justifyContent: 'space-around' }, brand: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 27, color: colors.plum, marginRight: 'auto', letterSpacing: -1 }, navItem: { minWidth: 48, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14 }, navItemWide: { flexDirection: 'row', paddingHorizontal: 14, gap: 8 }, navActive: { backgroundColor: colors.lavenderSurface }, navText: { color: colors.mutedText, fontSize: 13, fontWeight: '500' }, navTextActive: { color: colors.plum, fontWeight: '700' }, placeholder: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' }, placeholderEyebrow: { color: colors.plum, fontSize: 10, letterSpacing: 2, fontWeight: '700' }, placeholderTitle: { color: colors.eggplant, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 42, marginTop: 12 }, placeholderText: { color: colors.mutedText, textAlign: 'center', marginTop: 12 }, placeholderButton: { marginTop: 25, backgroundColor: colors.plum, borderRadius: 13, padding: 16 }, placeholderButtonText: { color: colors.white, fontWeight: '600' } });
