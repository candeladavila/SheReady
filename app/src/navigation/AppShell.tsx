import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import VoiceInterviewScreen from '../screens/VoiceInterviewScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import { colors } from '../theme/colors';

type Route = 'home' | 'practice' | 'activities' | 'news' | 'calendar' | 'profile';
const tabs: { id: Route; label: string }[] = [
  { id: 'home', label: 'Inicio' }, { id: 'practice', label: 'Entrevista' }, { id: 'activities', label: 'Actividades' }, { id: 'news', label: 'Actualidad' }, { id: 'calendar', label: 'Entrevistas' }, { id: 'profile', label: 'Mi perfil' },
];
function Icon({ name, active }: { name: Route; active: boolean }) {
  const color = active ? colors.plum : colors.mutedText;
  return <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {name === 'home' && <><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>}
    {name === 'practice' && <><Rect x="8" y="3" width="8" height="12" rx="4" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6" /></>}
    {name === 'activities' && <><Circle cx="12" cy="12" r="8" /><Path d="M8 13c1-3 3-4 4-4s3 1 4 4M9 16h6" /></>}
    {name === 'news' && <><Rect x="3" y="4" width="18" height="16" rx="2" /><Path d="M7 8h4v4H7zM14 8h3M14 11h3M7 16h10" /></>}
    {name === 'calendar' && <><Rect x="3" y="5" width="18" height="16" rx="2" /><Path d="M7 3v4m10-4v4M3 10h18M8 14h2m4 0h2m-8 3h2" /></>}
    {name === 'profile' && <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>}
  </Svg>;
}
export default function AppShell() {
  const [route, setRoute] = useState<Route>('practice');
  const [sessionActive, setSessionActive] = useState(false);
  const wide = useWindowDimensions().width >= 1050;
  const navigation = <View style={[styles.nav, wide ? styles.navWide : styles.navMobile]}>{wide && <Text style={styles.brand}>SheReady</Text>}{tabs.map(tab => <Pressable key={tab.id} accessibilityRole="tab" accessibilityLabel={tab.label} accessibilityState={{ selected: route === tab.id }} onPress={() => setRoute(tab.id)} style={[styles.navItem, wide && styles.navItemWide, route === tab.id && styles.navActive]}><Icon name={tab.id} active={route === tab.id} />{wide && <Text style={[styles.navText, route === tab.id && styles.navTextActive]}>{tab.label}</Text>}</Pressable>)}</View>;
  return <View style={styles.root}><StatusBar style="dark" />{wide && !sessionActive && navigation}<View style={styles.main}>{route === 'practice' ? <VoiceInterviewScreen onSessionChange={setSessionActive} /> : route === 'activities' ? <ActivitiesScreen onSessionChange={setSessionActive} /> : <View style={styles.placeholder}><Text style={styles.placeholderEyebrow}>SHEREADY</Text><Text style={styles.placeholderTitle}>{tabs.find(tab => tab.id === route)?.label}</Text><Text style={styles.placeholderText}>Esta sección estará disponible próximamente.</Text><Pressable accessibilityRole="button" onPress={() => setRoute('practice')} style={styles.placeholderButton}><Text style={styles.placeholderButtonText}>Ir a la entrevista  ↗</Text></Pressable></View>}</View>{!wide && !sessionActive && navigation}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.ivory, paddingTop: Platform.OS === 'ios' ? 48 : 0 }, main: { flex: 1 }, nav: { backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', borderColor: colors.border }, navWide: { minHeight: 82, paddingHorizontal: 48, borderBottomWidth: 1, gap: 5 }, navMobile: { borderTopWidth: 1, minHeight: 72, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 22 : 10, justifyContent: 'space-around' }, brand: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 27, color: colors.plum, marginRight: 'auto', letterSpacing: -1 }, navItem: { minWidth: 48, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14 }, navItemWide: { flexDirection: 'row', paddingHorizontal: 14, gap: 8 }, navActive: { backgroundColor: colors.lavenderSurface }, navText: { color: colors.mutedText, fontSize: 13, fontWeight: '500' }, navTextActive: { color: colors.plum, fontWeight: '700' }, placeholder: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' }, placeholderEyebrow: { color: colors.plum, fontSize: 10, letterSpacing: 2, fontWeight: '700' }, placeholderTitle: { color: colors.eggplant, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 42, marginTop: 12 }, placeholderText: { color: colors.mutedText, textAlign: 'center', marginTop: 12 }, placeholderButton: { marginTop: 25, backgroundColor: colors.plum, borderRadius: 13, padding: 16 }, placeholderButtonText: { color: colors.white, fontWeight: '600' } });
