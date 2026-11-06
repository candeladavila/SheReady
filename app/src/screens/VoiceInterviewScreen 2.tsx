import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Interviewer } from '../components/InterviewVisuals';
import VoiceVisualization from '../components/VoiceVisualization';
import { colors } from '../theme/colors';
import LaunchScreen from './LaunchScreen';

type Phase = 'interviewer' | 'user' | 'finish' | 'logo' | 'done';
const prompts = ['Cuéntame un poco sobre ti y tu trayectoria profesional.', '¿Qué te motiva a dar este siguiente paso en tu carrera?'];
export default function VoiceInterviewScreen() {
  const [phase, setPhase] = useState<Phase>('interviewer');
  const [round, setRound] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  useEffect(() => {
    if (phase !== 'interviewer') return;
    const timer = setTimeout(() => setPhase('user'), 4500);
    return () => clearTimeout(timer);
  }, [phase, round]);
  useEffect(() => {
    if (phase !== 'finish') return;
    Animated.timing(fade, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    const timer = setTimeout(() => setPhase('logo'), 3600);
    return () => clearTimeout(timer);
  }, [phase, fade]);
  const finishTurn = () => {
    if (phase !== 'user') return;
    if (round === 0) { setRound(1); setPhase('interviewer'); }
    else setPhase('finish');
  };
  const reset = () => { fade.setValue(0); setRound(0); setPhase('interviewer'); };
  if (phase === 'logo') return <LaunchScreen onFinish={() => setPhase('done')} />;
  if (phase === 'finish') return <Animated.View style={[styles.finish, { opacity: fade }]}><Text style={styles.finishText}>¡Listo, lo has hecho genial!{ '\n' }Ahora vamos a analizar cómo te ha ido</Text></Animated.View>;
  if (phase === 'done') return <View style={styles.done}><Text style={styles.overline}>PRÁCTICA COMPLETADA</Text><Text style={styles.title}>Cada paso cuenta.</Text><Text style={styles.description}>Has terminado la demostración. El análisis de tu entrevista estará disponible más adelante.</Text><Pressable accessibilityRole="button" onPress={reset} style={styles.again}><Text style={styles.againText}>Repetir demostración  ↗</Text></Pressable></View>;
  const speaking = phase === 'interviewer';
  return <ScrollView contentContainerStyle={[styles.page, wide && styles.pageWide]}>
    <View style={styles.intro}><Text style={styles.overline}>TU ESPACIO PARA PRACTICAR</Text><Text style={styles.title}>Una conversación{ '\n' }a tu ritmo.</Text><Text style={styles.description}>Un espacio para ensayar, ganar soltura y prepararte para tu próxima oportunidad.</Text><View style={styles.demoTag}><View style={styles.demoDot} /><Text style={styles.demoText}>DEMOSTRACIÓN · SIN AUDIO NI GRABACIÓN</Text></View></View>
    <View style={[styles.panel, wide && styles.panelWide, !wide && height < 720 && styles.panelCompact]}>
      <View style={styles.panelHeader}><Text style={styles.panelLabel}>ENTREVISTA DE PRÁCTICA</Text><Text style={styles.count}>{Math.min(round * 2 + (speaking ? 1 : 2), 4)} / 4</Text></View>
      <View style={styles.visual}><View style={styles.visualInner}>{speaking ? <Interviewer /> : <VoiceVisualization />}</View></View>
      <View style={styles.panelBottom}><View style={styles.status}><View style={[styles.statusDot, { backgroundColor: speaking ? colors.coral : colors.sage }]} /><Text style={styles.statusText}>{speaking ? 'Tu entrevistador está hablando' : 'Es tu turno'}</Text></View><Text style={styles.prompt}>{speaking ? prompts[round] : 'Cuando termines, toca la pantalla para continuar.'}</Text><Pressable accessibilityRole="button" accessibilityLabel={speaking ? 'Esperando al entrevistador' : 'Terminar mi turno'} disabled={speaking} onPress={finishTurn} style={[styles.action, speaking && styles.actionIdle]}><Text style={[styles.actionText, speaking && styles.actionTextIdle]}>{speaking ? 'Escuchando' : 'Terminar mi respuesta'}  {speaking ? '···' : '↗'}</Text></Pressable></View>
      {!speaking && <Pressable accessibilityRole="button" accessibilityLabel="Terminar mi respuesta" onPress={finishTurn} style={styles.tapSurface} />}
    </View>
  </ScrollView>;
}
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({ page: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, gap: 25, backgroundColor: colors.ivory }, pageWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 72, paddingHorizontal: 60, paddingVertical: 45 }, intro: { maxWidth: 420 }, overline: { fontSize: 10, letterSpacing: 2, color: colors.plum, fontWeight: '700', marginBottom: 16 }, title: { fontFamily: serif, color: colors.eggplant, fontSize: 42, lineHeight: 46, letterSpacing: -1.5 }, description: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 14 }, demoTag: { marginTop: 23, alignSelf: 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 20, backgroundColor: colors.lavenderSurface }, demoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.plum }, demoText: { color: colors.plum, fontSize: 9, letterSpacing: 0.8, fontWeight: '700' }, panel: { flex: 1, minHeight: 420, maxWidth: 490, width: '100%', alignSelf: 'center', backgroundColor: colors.white, borderRadius: 26, padding: 22, borderWidth: 1, borderColor: colors.border }, panelWide: { flex: 1, minHeight: 610, maxHeight: 690 }, panelCompact: { minHeight: 380 }, panelHeader: { flexDirection: 'row', justifyContent: 'space-between' }, panelLabel: { fontSize: 10, color: colors.mutedText, letterSpacing: 1.2, fontWeight: '600' }, count: { color: colors.plum, fontSize: 12, fontWeight: '700' }, visual: { flex: 1, minHeight: 200, maxHeight: 345, alignItems: 'center', justifyContent: 'center', padding: 15 }, visualInner: { width: '100%', maxWidth: 300, alignItems: 'center' }, panelBottom: { alignItems: 'center', gap: 13 }, status: { flexDirection: 'row', gap: 8, alignItems: 'center' }, statusDot: { width: 8, height: 8, borderRadius: 4 }, statusText: { fontWeight: '600', fontSize: 13, color: colors.plum }, prompt: { color: colors.eggplant, textAlign: 'center', fontSize: 15, lineHeight: 22, minHeight: 44 }, action: { backgroundColor: colors.plum, minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, width: '100%' }, actionIdle: { backgroundColor: colors.lavenderSurface }, actionText: { color: colors.white, fontSize: 14, fontWeight: '600' }, actionTextIdle: { color: colors.plum }, tapSurface: { ...StyleSheet.absoluteFillObject, zIndex: 1 }, finish: { flex: 1, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center', padding: 30 }, finishText: { color: colors.ivory, fontFamily: serif, textAlign: 'center', fontSize: 33, lineHeight: 43, maxWidth: 550 }, done: { flex: 1, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center', padding: 30 }, again: { marginTop: 28, backgroundColor: colors.plum, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24 }, againText: { color: colors.white, fontWeight: '600' } });
