import { api, PlannedActivity } from '../services/api';
import PersonalizedActivityScreen from '../features/personalizedActivities/PersonalizedActivityScreen';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';
import LaunchScreen from './LaunchScreen';
import ActivityIllustration from '../components/ActivityIllustration';
import { sectorIllustration } from '../constants/sectorIllustrations';
import ReflectionActivity from './ReflectionActivity';

const PLAYLIST = 'https://open.spotify.com/user/spotify/playlist/37i9dQZF1DWZqd5JICZI0u?OS=&TappID=285042';
type Screen = 'list' | 'instructions' | 'breathing' | 'logo' | 'finished' | 'mini' | 'confidence';

export default function ActivitiesScreen({ onSessionChange, selectedSector, planId, initialScreen = 'list' }: { onSessionChange: (active: boolean) => void; selectedSector?: string; planId: string | null; initialScreen?: 'list' | 'instructions' | 'confidence' | 'mini' }) {
  const [personalized, setPersonalized] = useState<PlannedActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [planError, setPlanError] = useState('');
  useEffect(() => { let active = true; setPersonalized([]); setPlanError(''); if (planId) api.rolePlans.list().then(result => { if (active) setPersonalized(result.items.find(item => item.id === planId && item.status === 'ready')?.plan?.activities ?? []); }).catch(() => { if (active) setPlanError('No hemos podido cargar tu plan. Vuelve a entrar para reintentar.'); }); return () => { active = false; }; }, [planId]);
  const completionId = useRef('');
  const [saveError, setSaveError] = useState('');
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [duration, setDuration] = useState<1 | 5 | 10>(1);
  const total = duration * 60_000;
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const scale = useRef(new Animated.Value(0)).current;
  const startedAt = useRef(0);
  const elapsedRef = useRef(0);
  const sessionChange = useRef(onSessionChange);
  sessionChange.current = onSessionChange;
  const { width, height } = useWindowDimensions();
  const illustration = sectorIllustration(selectedSector || 'Tecnología', 'actividad');
  const catalogWide = width >= 900;
  const catalogLarge = width >= 1200;
  const circleSize = Math.min(280, width - 90, Math.max(170, height * 0.34));
  const cyclePosition = elapsed % 12_000;
  const phase = cyclePosition < 5_000 ? 'inhale' : cyclePosition < 7_000 ? 'hold' : 'exhale';

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {}); }, []);
  useEffect(() => { sessionChange.current(screen === 'breathing' || screen === 'logo' || screen === 'finished'); }, [screen]);
  useEffect(() => () => sessionChange.current(false), []);
  useEffect(() => {
    if (screen !== 'breathing' || paused) return;
    startedAt.current = Date.now() - elapsedRef.current;
    const timer = setInterval(() => {
      const next = Math.min(total, Date.now() - startedAt.current);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) { clearInterval(timer); setScreen('logo'); }
    }, 100);
    return () => clearInterval(timer);
  }, [screen, paused, total]);
  useEffect(() => {
    if (screen !== 'breathing' || paused || reduceMotion) return;
    const position = elapsedRef.current % 12_000;
    const progress = position < 5_000 ? position / 5_000 : position < 7_000 ? 1 : 1 - (position - 7_000) / 5_000;
    scale.setValue(progress);
    if (position >= 5_000 && position < 7_000) return;
    const inhale = position < 5_000;
    const animation = Animated.timing(scale, { toValue: inhale ? 1 : 0, duration: inhale ? 5_000 - position : 12_000 - position, easing: Easing.linear, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [screen, paused, phase, reduceMotion, scale]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => {
      if (next !== 'active' && screen === 'breathing' && !paused) {
        elapsedRef.current = Math.min(total, Date.now() - startedAt.current);
        setElapsed(elapsedRef.current);
        setPaused(true);
      }
    });
    return () => listener.remove();
  }, [screen, paused, total]);
  useEffect(() => { if (screen === 'finished') api.wellbeingComplete({ id: completionId.current, kind: 'breathing', duration_seconds: duration * 60 }).catch(() => setSaveError('No se pudo registrar la práctica en el servidor.')); }, [screen]);
  const start = () => { completionId.current = `breathing-${Date.now()}-${Math.random().toString(36).slice(2)}`; setSaveError(''); elapsedRef.current = 0; setElapsed(0); setPaused(false); setScreen('breathing'); };
  const togglePause = () => {
    if (!paused) { elapsedRef.current = Math.min(total, Date.now() - startedAt.current); setElapsed(elapsedRef.current); }
    setPaused(!paused);
  };
  const openPlaylist = async () => { try { setLinkError(false); await Linking.openURL(PLAYLIST); } catch { setLinkError(true); } };
  if (screen === 'mini' || screen === 'confidence') return <ReflectionActivity kind={screen} onBack={() => setScreen('list')} />;
  if (selectedActivity !== null && planId && personalized[selectedActivity]) return <PersonalizedActivityScreen activity={personalized[selectedActivity]} index={selectedActivity} planId={planId} onBack={() => setSelectedActivity(null)} />;
  if (screen === 'logo') return <LaunchScreen onFinish={() => setScreen('finished')} />;
  if (screen === 'finished') return <View style={styles.finish}><Text style={styles.finishEyebrow}>UN MOMENTO PARA TI</Text><Text style={styles.finishTitle}>Actividad terminada.</Text><Text style={styles.finishCopy}>Has dedicado {duration === 1 ? 'un minuto' : `${duration} minutos`} a ti. Continúa a tu ritmo. {saveError}</Text><Pressable accessibilityRole="button" onPress={() => setScreen('list')} style={styles.finishButton}><Text style={styles.finishButtonText}>Volver a actividades  ↗</Text></Pressable></View>;
  if (screen === 'breathing') return <View style={styles.breathe}>
    <View style={styles.breatheHeader}><Text style={styles.eyebrow}>UN MOMENTO PARA TI</Text><Text style={styles.timer}>{`${Math.floor(Math.ceil((total - elapsed) / 1000) / 60)}:${String(Math.ceil((total - elapsed) / 1000) % 60).padStart(2, '0')}`}</Text></View>
    <View style={styles.breatheCenter}><View style={[styles.circleArea, { width: circleSize, height: circleSize }]}><View style={styles.outerCircle} /><Animated.View style={[styles.innerCircle, { transform: [{ scale: reduceMotion ? 0.88 : scale.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] }) }] }]} /><View style={styles.circleLabel}><Text accessibilityLiveRegion="polite" style={styles.phase}>{paused ? 'En pausa' : phase === 'inhale' ? 'Inhala' : phase === 'hold' ? 'Pausa' : 'Exhala'}</Text><Text style={styles.phaseHint}>{paused ? 'Retoma cuando quieras' : phase === 'inhale' ? 'Suavemente' : phase === 'hold' ? 'Solo si te resulta cómodo' : 'Sin prisa'}</Text></View></View><Text style={styles.breatheCopy}>Respira de forma cómoda, sin forzar.</Text></View>
    <View style={styles.controls}><Pressable accessibilityRole="button" onPress={togglePause} style={styles.primaryButton}><Text style={styles.primaryText}>{paused ? 'Continuar' : 'Pausar'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setScreen('list')} style={styles.textButton}><Text style={styles.textButtonText}>Salir de la actividad</Text></Pressable></View>
  </View>;
  if (screen === 'instructions') return <ScrollView contentContainerStyle={styles.scroll}><View style={styles.container}><Back onPress={() => setScreen('list')} /><Text style={styles.eyebrow}>MINDFULNESS · RESPIRACIÓN GUIADA</Text><Text style={styles.title}>Un respiro para ti.</Text><Text style={styles.lead}>Antes de empezar, prepara un pequeño espacio para estar contigo.</Text><View style={styles.instructionCard}>
    <Instruction number="01" title="Busca un lugar tranquilo" text="Siéntate cómodamente y apoya los pies en el suelo. Si te apetece, cierra los ojos o suaviza la mirada." />
    <Instruction number="02" title="Elige tu ambiente" text="Si hay ruido, puedes usar auriculares con ruido blanco o música tranquila. El silencio también está bien." />
    <Pressable accessibilityRole="link" onPress={openPlaylist} style={styles.playlist}><Text style={styles.playlistText}>♫   Peaceful Meditation · Spotify  ↗</Text></Pressable>{linkError && <Text style={styles.error}>No se ha podido abrir Spotify. Puedes continuar en silencio.</Text>}
    <Instruction number="03" title="Sigue tu propio ritmo" text="Inhala 5 segundos, haz una pausa de 2 segundos si te resulta cómoda y exhala durante 5 segundos. No fuerces la respiración; puedes respirar con normalidad, pausar o parar cuando lo necesites." />
    </View><Text style={styles.note}>Si sientes incomodidad o mareo, detente y vuelve a tu respiración habitual.</Text><Text style={styles.durationHeading}>¿Cuánto tiempo quieres dedicarte?</Text><View style={styles.durationOptions} accessibilityRole="radiogroup">{([1, 5, 10] as const).map(minutes => <Pressable key={minutes} accessibilityRole="radio" accessibilityState={{ checked: duration === minutes }} onPress={() => setDuration(minutes)} style={[styles.durationChoice, duration === minutes && styles.durationChoiceSelected]}><Text style={[styles.durationChoiceText, duration === minutes && styles.durationChoiceTextSelected]}>{minutes} {minutes === 1 ? 'minuto' : 'minutos'}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={start} style={styles.primaryButton}><Text style={styles.primaryText}>Empezar actividad  ↗</Text></Pressable></View></ScrollView>;
  return <ScrollView contentContainerStyle={styles.scroll}><View style={[styles.container, catalogWide && styles.catalogContainer]}><View style={styles.catalogHeader}><View style={styles.catalogHeaderText}><Text style={styles.eyebrow}>TU ESPACIO DE BIENESTAR</Text><Text style={styles.title}>Pequeños pasos,{ '\n' }grandes momentos.</Text><Text style={styles.lead}>Actividades breves para hacer una pausa y acompañarte en tu camino.</Text></View>{illustration && <Image source={illustration} style={[styles.catalogIllustration, catalogWide && styles.catalogIllustrationWide]} resizeMode="contain" accessible={false} />}</View><Text style={styles.section}>PARA TU DÍA A DÍA</Text><View style={[styles.activityGrid, catalogWide && styles.activityGridWide]}><Pressable accessibilityRole="button" onPress={() => setScreen('instructions')} style={({ pressed }) => [styles.activity, catalogWide && styles.gridItem, catalogLarge && styles.gridItemThird, pressed && { opacity: 0.8 }]}><ActivityIllustration kind="breathing" /><View style={styles.activityBody}><View style={styles.activityMeta}><Text style={styles.tag}>MINDFULNESS</Text><Text style={styles.duration}>◷  1, 5 o 10 min</Text></View><Text style={styles.activityTitle}>Un momento para respirar</Text><Text style={styles.activityDescription}>Una pausa guiada para conectar con tu respiración y volver a tu ritmo.</Text><Text style={styles.activityLink}>Ver actividad  ↗</Text></View></Pressable><ActivityCard wide={catalogWide} large={catalogLarge} kind="mini" category="REFLEXIÓN" duration="Sin tiempo límite" title="Para mi mini yo" description="Escribe y guarda las palabras que le dedicarías para recordar todo lo que has recorrido." onPress={() => setScreen('mini')} /><ActivityCard wide={catalogWide} large={catalogLarge} kind="confidence" category="CONFIANZA" duration="3 min aprox." title="Mi evidencia de confianza" description="Reconoce una experiencia propia y las capacidades que te ayudaron a avanzar." onPress={() => setScreen('confidence')} /></View><Text style={styles.section}>PARA TUS ENTREVISTAS</Text><View style={[styles.activityGrid, catalogWide && styles.activityGridWide]}>{personalized.length ? personalized.map((activity, index) => <Pressable key={index} accessibilityRole="button" onPress={() => setSelectedActivity(index)} style={[styles.activity, catalogWide && styles.gridItem, catalogLarge && styles.gridItemThird]}><View style={{ height: 100, backgroundColor: activity.color }} /><View style={styles.activityBody}><Text style={styles.tag}>PARA TU PUESTO · {activity.duration_minutes} MIN</Text><Text style={styles.activityTitle}>{activity.title}</Text><Text style={styles.activityDescription}>{activity.description}</Text><Text style={styles.activityLink}>Ver actividad  ↗</Text></View></Pressable>) : <View style={[styles.upcoming, catalogWide && styles.gridItem]}><Text style={styles.upcomingTag}>TU PLAN PERSONALIZADO</Text><Text style={styles.activityTitle}>{planError || 'Añade un puesto para crear tu plan.'}</Text></View>}</View></View></ScrollView>;
}
function ActivityCard({ wide = false, large = false, kind, category, duration, title, description, onPress }: { wide?: boolean; large?: boolean; kind: 'mini' | 'confidence'; category: string; duration: string; title: string; description: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.activity, wide && styles.gridItem, large && styles.gridItemThird, pressed && { opacity: 0.8 }]}><ActivityIllustration kind={kind} /><View style={styles.activityBody}><View style={styles.activityMeta}><Text style={styles.tag}>{category}</Text><Text style={styles.duration}>◷  {duration}</Text></View><Text style={styles.activityTitle}>{title}</Text><Text style={styles.activityDescription}>{description}</Text><Text style={styles.activityLink}>Ver actividad  ↗</Text></View></Pressable>; }
function Back({ onPress }: { onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.back}><Text style={styles.backText}>←  Volver</Text></Pressable>; }
function Instruction({ number, title, text }: { number: string; title: string; text: string }) { return <View style={styles.instruction}><Text style={styles.number}>{number}</Text><View style={styles.instructionBody}><Text style={styles.instructionTitle}>{title}</Text><Text style={styles.instructionText}>{text}</Text></View></View>; }
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  catalogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, catalogHeaderText: { flex: 1, minWidth: 0 }, catalogIllustration: { width: 110, height: 155 }, catalogIllustrationWide: { width: 210, height: 230 },
  catalogContainer: { maxWidth: 1500 }, activityGrid: { gap: 16 }, activityGridWide: { flexDirection: 'row', flexWrap: 'wrap' }, gridItem: { flexBasis: '47%', flexGrow: 1, flexShrink: 1, minWidth: 0 }, gridItemThird: { flexBasis: '30%' },
  upcoming: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.lavenderSurface, padding: 22 }, upcomingTag: { color: colors.plum, fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  durationHeading: { color: colors.eggplant, fontSize: 15, fontWeight: '700', marginBottom: 12 }, durationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }, durationChoice: { minHeight: 48, paddingHorizontal: 17, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }, durationChoiceSelected: { borderColor: colors.plum, backgroundColor: colors.sageSurface }, durationChoiceText: { color: colors.eggplant, fontSize: 14 }, durationChoiceTextSelected: { color: colors.plum, fontWeight: '700' },
  scroll: { flexGrow: 1, backgroundColor: colors.ivory, paddingHorizontal: 24, paddingVertical: 36, alignItems: 'center' }, container: { width: '100%', maxWidth: 680 }, eyebrow: { color: colors.plum, fontWeight: '700', fontSize: 10, letterSpacing: 1.7, marginBottom: 15 }, title: { fontFamily: serif, color: colors.eggplant, fontSize: 39, lineHeight: 44, letterSpacing: -1.4 }, lead: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 15 }, section: { color: colors.mutedText, fontWeight: '700', fontSize: 10, letterSpacing: 1.5, marginTop: 36, marginBottom: 15 }, activity: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, activityArt: { height: 155, backgroundColor: colors.lavenderSurface, justifyContent: 'center', alignItems: 'center' }, artOuter: { width: 116, height: 116, borderRadius: 58, backgroundColor: colors.lavender, justifyContent: 'center', alignItems: 'center' }, artInner: { width: 78, height: 78, borderRadius: 39, backgroundColor: colors.sage }, activityBody: { padding: 22 }, activityMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, tag: { color: colors.plum, fontWeight: '700', fontSize: 10, letterSpacing: 1.1 }, duration: { color: colors.mutedText, fontSize: 12 }, activityTitle: { fontFamily: serif, fontSize: 28, lineHeight: 34, color: colors.eggplant, marginTop: 14 }, activityDescription: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 8 }, activityLink: { color: colors.plum, fontSize: 14, fontWeight: '700', marginTop: 18 }, back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginBottom: 18 }, backText: { color: colors.plum, fontSize: 15 }, instructionCard: { marginTop: 26, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.white, padding: 20, gap: 20 }, instruction: { flexDirection: 'row', gap: 14 }, number: { color: colors.plum, backgroundColor: colors.lavenderSurface, overflow: 'hidden', textAlign: 'center', lineHeight: 30, width: 30, height: 30, borderRadius: 15, fontSize: 11, fontWeight: '700' }, instructionBody: { flex: 1 }, instructionTitle: { color: colors.eggplant, fontSize: 15, lineHeight: 21, fontWeight: '700' }, instructionText: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 5 }, playlist: { marginLeft: 44, minHeight: 44, justifyContent: 'center' }, playlistText: { color: colors.plum, fontSize: 14, lineHeight: 20, fontWeight: '700' }, error: { color: colors.eggplant, fontSize: 13 }, note: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginVertical: 18 }, primaryButton: { minHeight: 56, borderRadius: 14, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }, primaryText: { color: colors.white, fontSize: 15, fontWeight: '700' }, breathe: { flex: 1, paddingHorizontal: 26, paddingTop: 30, paddingBottom: Platform.OS === 'ios' ? 42 : 25, backgroundColor: colors.ivory }, breatheHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, timer: { color: colors.plum, fontWeight: '700', fontSize: 15 }, breatheCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }, circleArea: { alignItems: 'center', justifyContent: 'center' }, outerCircle: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, backgroundColor: colors.lavenderSurface }, innerCircle: { position: 'absolute', width: '88%', height: '88%', borderRadius: 999, backgroundColor: colors.sage }, circleLabel: { alignItems: 'center' }, phase: { color: colors.eggplant, fontFamily: serif, fontSize: 38 }, phaseHint: { color: colors.mutedText, fontSize: 13, marginTop: 5 }, breatheCopy: { color: colors.mutedText, fontSize: 14, textAlign: 'center' }, controls: { gap: 5, width: '100%', maxWidth: 400, alignSelf: 'center' }, textButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center' }, textButtonText: { color: colors.plum, fontSize: 14, fontWeight: '600' }, finish: { flex: 1, backgroundColor: colors.plum, padding: 30, alignItems: 'center', justifyContent: 'center' }, finishEyebrow: { color: colors.sage, fontSize: 10, letterSpacing: 1.7, fontWeight: '700', marginBottom: 20 }, finishTitle: { fontFamily: serif, color: colors.ivory, fontSize: 40, lineHeight: 47, textAlign: 'center' }, finishCopy: { color: colors.lightText, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 16 }, finishButton: { backgroundColor: colors.ivory, paddingVertical: 17, paddingHorizontal: 23, borderRadius: 14, marginTop: 32 }, finishButtonText: { color: colors.plum, fontWeight: '700' },
});
