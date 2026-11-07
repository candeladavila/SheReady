import { api, Interview, InterviewSummary } from '../services/api';
import { useInterviewAudio } from '../services/useInterviewAudio';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import SpeakingWoman from '../components/SpeakingWoman';
import InterviewExitScreen from '../features/interviewExit/InterviewExitScreen';
import { sectorIllustration, speakingFrameOffsets } from '../constants/sectorIllustrations';
import { colors } from '../theme/colors';
import LaunchScreen from './LaunchScreen';

type Phase = 'menu' | 'history' | 'duration' | 'interviewer' | 'user' | 'logo' | 'reflection' | 'finish' | 'review';
type InterviewRecord = { id: string; company: string; role: string; date: string };



export default function VoiceInterviewScreen({ selectedSector, onSessionChange, onRealInterviews }: { selectedSector?: string; onSessionChange: (active: boolean) => void; onRealInterviews: () => void }) {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [records, setRecords] = useState<InterviewSummary[]>([]);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const audio = useInterviewAudio();
  const history: InterviewRecord[] = records.map(r => ({ id: r.id, company: r.summary ?? 'Entrevista en curso', role: r.duration_minutes === 1 ? 'Una pregunta' : `${r.duration_minutes} minutos`, date: new Date(r.created_at).toLocaleDateString('es-ES') }));
  const prompts = interview?.turns.map(t => t.question.text) ?? [];
  async function run(action: () => Promise<void>) {
    if (pending.current) return; pending.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { const message = e instanceof Error ? e.message : 'No se pudo completar la operación.'; setError(message); if (phase === 'user') Alert.alert('No se pudo enviar la respuesta', message); }
    finally { pending.current = false; setBusy(false); }
  }
  async function openHistory() {
    await run(async () => {
      const all: InterviewSummary[] = []; let total = 1;
      while (all.length < total) { const page = await api.interviews.list(100, all.length); all.push(...page.items); total = page.total; if (!page.items.length) break; }
      setRecords(all); setPhase('history');
    });
  }
  const [phase, setPhase] = useState<Phase>('menu');
  const [round, setRound] = useState(0);
  const [duration, setDuration] = useState<1 | 5 | 10 | 15>(5);
  const [showActions, setShowActions] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const wide = width >= 760;
  const guide = sectorIllustration(selectedSector || 'Tecnología', 'hablando');
  const speakerSector = sectorIllustration(selectedSector, 'conversando') ? selectedSector : 'Tecnología';
  const speaker = sectorIllustration(speakerSector, 'conversando');
  const visualSize = Math.max(140, Math.min(width - 64, height * 0.38, 340));
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  useEffect(() => {
    const active = ['interviewer', 'user', 'logo', 'reflection', 'finish'].includes(phase);
    onSessionChangeRef.current(active);
  }, [phase]);
  useEffect(() => () => onSessionChangeRef.current(false), []);
  useEffect(() => {
    if (phase !== 'interviewer') return;
    let live = true;
    if (!interview?.current_turn) return;
    void (async () => {
      try {
        await audio.play(interview.id, interview.current_turn!.id);
        if (live) { await audio.record(); if (live) setPhase('user'); else await audio.stop(); }
      } catch (e) { if (live) { setError(e instanceof Error ? e.message : 'No se pudo iniciar el audio.'); setPhase('duration'); } }
    })();
    return () => { live = false; };

  }, [phase, round]);
  useEffect(() => {
    if (phase !== 'finish') return;
    opacity.setValue(0);
    const animation = Animated.timing(opacity, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true });
    animation.start();
    const timer = setTimeout(() => setShowActions(true), 1800);
    return () => { animation.stop(); clearTimeout(timer); };
  }, [phase, opacity]);
  const start = () => { setDuration(5); setPhase('duration'); };
  const beginInterview = () => void run(async () => { const created = await api.interviews.start(duration); setInterview(created); setRound(0); setShowActions(false); setPhase('interviewer'); });
  const finishTurn = () => {
    if (phase !== 'user' || !interview?.current_turn) return;
    void run(async () => {
      const { transcript } = await audio.transcribe(interview.id);
      const next = await api.interviews.answer(interview.id, interview.current_turn!.id, transcript);
      setInterview(next);
      if (next.current_turn) { setRound(next.turns.length - 1); setPhase('interviewer'); }
      else { setInterview(await api.interviews.finish(next.id)); setPhase('logo'); }
    });
  };


  if (phase === 'logo') return <LaunchScreen onFinish={() => setPhase('reflection')} />;
  if (phase === 'reflection' && interview) return <InterviewExitScreen interviewId={interview.id} onFinish={() => setPhase(interview.status === 'completed' ? 'finish' : 'menu')} />;
  if (phase === 'finish') return <View style={styles.finish}><Animated.View style={[styles.finishContent, { opacity }]}><Text style={styles.finishText}>¡Listo, lo has hecho genial!</Text><Text style={styles.finishDescription}>Ahora vamos a analizar cómo te ha ido</Text>{showActions && <View style={styles.finishActions}><Pressable accessibilityRole="button" onPress={() => setPhase('review')} style={styles.lightButton}><Text style={styles.lightButtonText}>Revisar cómo ha ido</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPhase('menu')} style={styles.laterButton}><Text style={styles.laterText}>Más tarde</Text></Pressable></View>}</Animated.View></View>;
  if (phase === 'interviewer' || phase === 'user') return <View style={styles.session}><ScrollView contentContainerStyle={styles.sessionScroll}><View style={styles.sessionPressable}><View style={{ width: visualSize, height: visualSize, alignItems: 'center', justifyContent: 'center' }}>{phase === 'interviewer' ? <SpeakingWoman source={require('../assets/men/entrevistador/conversando.png')} size={visualSize} animated={audio.playing} accessibilityLabel="Ilustración de un entrevistador" /> : speaker && <SpeakingWoman source={speaker} size={visualSize} frameOffsets={speakingFrameOffsets(speakerSector)} />}</View><Text style={styles.turnStatus}>{phase === 'interviewer' ? 'El entrevistador está hablando' : 'Es tu turno'}</Text><Text style={styles.question}>{interview?.current_turn?.question.text ?? prompts[round]}</Text>{phase === 'user' && <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={finishTurn} style={[styles.nextQuestion, busy && { opacity: 0.5 }]}><Text style={styles.nextQuestionText}>{busy ? 'Procesando respuesta…' : 'Siguiente pregunta'}  ↗</Text></Pressable>}</View></ScrollView><Pressable accessibilityRole="button" accessibilityLabel="Salir de la entrevista" onPress={() => { void audio.stop(); setPhase(interview ? 'reflection' : 'menu'); }} style={({ pressed }) => [styles.exitButton, pressed && styles.exitPressed]}><Text style={styles.exitText}>Salir de la entrevista</Text></Pressable></View>;
  if (phase === 'duration') return <ScrollView contentContainerStyle={styles.centered}><View style={styles.content}><Pressable onPress={() => setPhase('menu')} accessibilityRole="button" style={styles.back}><Text style={styles.backText}>←  Volver</Text></Pressable><Text style={styles.eyebrow}>PREPARA TU ENTREVISTA</Text><Text style={styles.heading}>¿Cuánto tiempo tienes?</Text><Text style={styles.copy}>{error || 'Elige la duración que prefieras para tu entrevista.'}</Text><View style={styles.durationOptions}>{([1, 5, 10, 15] as const).map(minutes => <Pressable key={minutes} accessibilityRole="radio" accessibilityState={{ checked: duration === minutes }} onPress={() => setDuration(minutes)} style={[styles.durationOption, duration === minutes && styles.durationSelected]}><Text style={styles.durationText}>{minutes === 1 ? 'Una pregunta' : `${minutes} minutos`}</Text><View style={[styles.durationRadio, duration === minutes && styles.durationRadioSelected]}>{duration === minutes && <View style={styles.durationDot} />}</View></Pressable>)}</View><Text style={styles.durationHint}>La duración es orientativa; las preguntas se adaptan a tu perfil.</Text><Button label={busy ? 'Preparando entrevista…' : `Empezar · ${duration === 1 ? 'una pregunta' : `${duration} minutos`}`} disabled={busy} onPress={beginInterview} /></View></ScrollView>;
  if (phase === 'review') return <ScrollView contentContainerStyle={styles.centered}><View style={styles.content}><Text style={styles.eyebrow}>TU PRÁCTICA</Text><Text style={styles.heading}>Tu revisión</Text><Text style={styles.copy}>{interview?.feedback ? [interview.feedback.summary, 'FORTALEZAS', ...interview.feedback.strengths, 'SUGERENCIAS', ...interview.feedback.improvements.map(i => `${i.suggestion}\nReformulación: ${i.reformulation}`), 'ACTIVIDADES', ...interview.feedback.recommended_activities.map(r => r.activity), 'TRANSCRIPCIÓN', ...interview.turns.map(t => `${t.question.text}\n${t.answer ?? 'Sin respuesta'}`)].join('\n\n') : 'Esta entrevista todavía no tiene análisis.'}</Text><Button label="Volver a entrevistas" onPress={() => setPhase('menu')} /></View></ScrollView>;
  if (phase === 'history') return <ScrollView contentContainerStyle={styles.centered}><View style={styles.content}><Pressable onPress={() => setPhase('menu')} accessibilityRole="button" style={styles.back}><Text style={styles.backText}>←  Volver</Text></Pressable><Text style={styles.eyebrow}>TU RECORRIDO</Text><Text style={styles.heading}>Entrevistas anteriores</Text><Text style={styles.copy}>Aquí podrás consultar tus simulacros por empresa, puesto y fecha.</Text>{history.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>✳</Text><Text style={styles.emptyTitle}>Aún no hay entrevistas</Text><Text style={styles.emptyCopy}>Cuando completes una entrevista, podrás encontrarla aquí para revisar cómo te fue.</Text><Pressable onPress={start} accessibilityRole="button" style={styles.emptyLink}><Text style={styles.emptyLinkText}>Empezar una entrevista  ↗</Text></Pressable></View> : history.map(item => <Pressable key={item.id} style={styles.record} accessibilityRole="button" onPress={() => void run(async () => { const saved = await api.interviews.get(item.id); setInterview(saved); setRound(saved.turns.length - 1); setPhase(saved.status === 'completed' ? 'review' : 'interviewer'); })}><Text style={styles.recordCompany}>{item.company}</Text><Text style={styles.copy}>{item.role} · {item.date}</Text></Pressable>)}</View></ScrollView>;
  return <ScrollView contentContainerStyle={[styles.menu, wide && styles.menuWide]}><View style={styles.menuIntro}><Text style={styles.eyebrow}>TU ESPACIO PARA PRACTICAR</Text><Text style={styles.heading}>Cada conversación{ '\n' }es un paso adelante.</Text><Text style={styles.copy}>{error || 'Prepárate a tu ritmo, ensaya tus respuestas y vuelve a tus entrevistas cuando quieras.'}</Text><View style={styles.demoTag}><Text style={styles.demoText}>PRÁCTICA DE ENTREVISTA</Text></View>{guide && <Image source={guide} style={[styles.guide, wide && styles.guideWide]} resizeMode="contain" accessible={false} />}</View><View style={styles.menuCards}><MenuCard number="01" title="Empezar una nueva entrevista" description="Practica en un espacio pensado para ti." onPress={start} primary /><MenuCard number="02" title="Analizar entrevistas anteriores" description="Revisa tus simulacros y observa tu evolución." onPress={() => void openHistory()} /><MenuCard number="03" title="Mis entrevistas reales" description="Consulta tus próximas entrevistas y el feedback de las anteriores." onPress={onRealInterviews} /></View></ScrollView>;
}
function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{label}  ↗</Text></Pressable>; }
function MenuCard({ number, title, description, onPress, primary = false }: { number: string; title: string; description: string; onPress: () => void; primary?: boolean }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, primary && styles.cardPrimary, pressed && { opacity: 0.8 }]}><View style={styles.cardTop}><Text style={[styles.cardNumber, primary && styles.cardLight]}>{number} / ENTREVISTA</Text><Text style={[styles.arrow, primary && styles.cardLight]}>↗</Text></View><Text style={[styles.cardTitle, primary && styles.cardLight]}>{title}</Text><Text style={[styles.cardDescription, primary && styles.cardLightMuted]}>{description}</Text></Pressable>; }
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  guide: { width: 160, height: 200, alignSelf: 'flex-end', marginTop: 12 }, guideWide: { width: 235, height: 280, alignSelf: 'center', marginTop: 22 },
  turnStatus: { color: colors.plum, fontSize: 13, fontWeight: '700', marginTop: 12, textAlign: 'center' }, question: { color: colors.eggplant, fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
  nextQuestion: { minHeight: 54, width: '85%', maxWidth: 320, paddingHorizontal: 18, marginTop: 24, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.plum }, nextQuestionText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  menu: { flexGrow: 1, backgroundColor: colors.ivory, paddingHorizontal: 26, paddingVertical: 40, justifyContent: 'center', gap: 36 }, menuWide: { flexDirection: 'row', alignItems: 'center', gap: 72, paddingHorizontal: 64 }, menuIntro: { width: '100%', maxWidth: 460 }, menuCards: { width: '100%', maxWidth: 470, gap: 14 }, eyebrow: { color: colors.plum, letterSpacing: 2, fontSize: 10, fontWeight: '700', marginBottom: 17 }, heading: { color: colors.eggplant, fontFamily: serif, fontSize: 40, lineHeight: 45, letterSpacing: -1.4 }, copy: { color: colors.mutedText, fontSize: 15, lineHeight: 24, marginTop: 16 }, demoTag: { marginTop: 24, alignSelf: 'flex-start', backgroundColor: colors.lavenderSurface, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9 }, demoText: { color: colors.plum, fontSize: 10, letterSpacing: 1, fontWeight: '700' }, card: { minHeight: 168, backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 22, justifyContent: 'space-between' }, cardPrimary: { backgroundColor: colors.plum, borderColor: colors.plum }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }, cardNumber: { color: colors.plum, fontSize: 10, letterSpacing: 1.3, fontWeight: '700' }, arrow: { color: colors.plum, fontSize: 25 }, cardTitle: { color: colors.eggplant, fontFamily: serif, fontSize: 26, lineHeight: 30 }, cardDescription: { color: colors.mutedText, fontSize: 13, lineHeight: 19, marginTop: 8 }, cardLight: { color: colors.ivory }, cardLightMuted: { color: colors.lightText },
  centered: { flexGrow: 1, backgroundColor: colors.ivory, padding: 26, alignItems: 'center', justifyContent: 'center' }, content: { width: '100%', maxWidth: 600 }, back: { alignSelf: 'flex-start', paddingVertical: 12, marginBottom: 24 }, backText: { color: colors.plum, fontSize: 15 }, empty: { alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.white, padding: 30, marginTop: 30 }, emptyIcon: { color: colors.lavender, fontSize: 35 }, emptyTitle: { color: colors.eggplant, fontFamily: serif, fontSize: 25, marginTop: 14, textAlign: 'center' }, emptyCopy: { color: colors.mutedText, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 10 }, emptyLink: { marginTop: 20, padding: 12 }, emptyLinkText: { color: colors.plum, fontWeight: '700' }, record: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 18, marginTop: 12 }, recordCompany: { color: colors.eggplant, fontSize: 17, fontWeight: '600' }, button: { marginTop: 25, backgroundColor: colors.plum, alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 14 }, buttonText: { color: colors.white, fontWeight: '600' },
  durationOptions: { gap: 10, marginTop: 28 }, durationOption: { minHeight: 62, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, durationSelected: { borderColor: colors.plum, backgroundColor: colors.sageSurface, borderWidth: 1.5 }, durationText: { color: colors.eggplant, fontSize: 16, fontWeight: '600' }, durationRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, durationRadioSelected: { borderColor: colors.plum, backgroundColor: colors.plum }, durationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sage }, durationHint: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 14 },
  exitButton: { position: 'absolute', top: 16, right: 20, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, exitPressed: { opacity: 0.7 }, exitText: { color: colors.plum, fontSize: 14, fontWeight: '600' },
  session: { flex: 1, backgroundColor: colors.ivory }, sessionScroll: { flexGrow: 1, paddingTop: 70, paddingBottom: 24, justifyContent: 'center' }, sessionPressable: { alignItems: 'center', justifyContent: 'center' }, finish: { flex: 1, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center', padding: 30 }, finishContent: { width: '100%', maxWidth: 520, alignItems: 'center' }, finishText: { fontFamily: serif, color: colors.ivory, fontSize: 40, lineHeight: 46, textAlign: 'center' }, finishDescription: { color: colors.lightText, fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 20 }, finishActions: { marginTop: 38, width: '100%', maxWidth: 320, gap: 12 }, lightButton: { minHeight: 54, backgroundColor: colors.ivory, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, lightButtonText: { color: colors.plum, fontWeight: '700', fontSize: 15 }, laterButton: { minHeight: 54, borderWidth: 1, borderColor: colors.lightBorder, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, laterText: { color: colors.ivory, fontWeight: '600', fontSize: 15 },
});
