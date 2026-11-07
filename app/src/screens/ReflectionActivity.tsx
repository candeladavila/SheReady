import TextInput from '../components/DictationInput';
import { api } from '../services/api';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '../services/accountStorage';
import { colors } from '../theme/colors';

type Props = { kind: 'mini' | 'confidence'; onBack: () => void };
type Note = { id: string; text: string; date: string };
const STORAGE_KEY = '@sheready/mini-yo-v1';
const questions = [
  { title: 'Recuerda un momento', text: 'Piensa en una situación en la que superaste un reto, ayudaste a alguien o aprendiste algo difícil.', placeholder: '¿Qué pasó?' },
  { title: 'Reconoce tu papel', text: '¿Qué hiciste tú para afrontar esa situación?', placeholder: 'Por ejemplo: escuché, pedí ayuda o perseveré…' },
  { title: 'Ponle nombre a tu capacidad', text: '¿Qué capacidad muestra esa experiencia? Escribe una frase que puedas recordar.', placeholder: 'Por ejemplo: puedo aprender cosas nuevas.' },
  { title: 'Llévalo a una entrevista', text: 'Si quieres, piensa en cómo contarías este ejemplo a una entrevistadora. Este paso es opcional.', placeholder: 'Podría contar que…' },
];
export default function ReflectionActivity({ kind, onBack }: Props) {
  const completionId = useRef(`confidence-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(kind === 'mini');
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState(['', '', '', '']);
  useEffect(() => {
    if (kind !== 'mini') return;
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (!active || !value) return;
      const parsed: unknown = JSON.parse(value);
      if (!Array.isArray(parsed) || !parsed.every(item => item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.date === 'string')) throw new Error('invalid data');
      setNotes(parsed);
    }).catch(() => { if (active) { setLoadFailed(true); setError('No se han podido leer tus frases. Vuelve a entrar para intentarlo de nuevo.'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind]);
  const persist = async (next: Note[]) => {
    setSaving(true); setError('');
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setNotes(next); return true; }
    catch { setError('No se han podido guardar los cambios. Inténtalo de nuevo.'); return false; }
    finally { setSaving(false); }
  };
  const add = async () => { const text = draft.trim(); if (!text || saving || loading || loadFailed) return; if (await persist([{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text, date: new Date().toISOString() }, ...notes])) setDraft(''); };
  const remove = async (id: string) => { if (saving) return; if (await persist(notes.filter(note => note.id !== id))) setDeleteId(null); };
  if (kind === 'mini') return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}><View style={styles.container}><Back onPress={onBack} /><Text style={styles.eyebrow}>UNA CARTA PARA TI · SIN PRISAS</Text><Text style={styles.title}>Para mi mini yo.</Text><Text style={styles.lead}>Mira todo lo que has recorrido. Escribe las palabras que te habría gustado escuchar y guarda aquí tus frases.</Text><View style={styles.card}><Text style={styles.label}>¿Qué le dirías hoy?</Text><Text style={styles.hint}>Por ejemplo: «Has aprendido a confiar en ti, incluso cuando parecía difícil».</Text><TextInput accessibilityLabel="Frase para mi mini yo" multiline value={draft} onChangeText={setDraft} placeholder="Querida mini yo…" placeholderTextColor={colors.subtleText} style={styles.input} maxLength={500} /><Text style={styles.private}>Tus frases se guardan solo en este dispositivo.</Text>{error && !loadFailed && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}<Button label={saving ? 'Guardando…' : 'Guardar frase'} onPress={add} disabled={!draft.trim() || saving || loading || loadFailed} /></View><Text style={styles.section}>TUS FRASES</Text>{loading ? <ActivityIndicator color={colors.plum} /> : loadFailed ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : notes.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>Todavía no hay frases. Tu primera palabra puede ser un buen comienzo.</Text></View> : notes.map(note => <View key={note.id} style={styles.note}><Text style={styles.quote}>“</Text><Text style={styles.noteText}>{note.text}</Text><Text style={styles.date}>{new Date(note.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>{deleteId === note.id ? <View style={styles.deleteRow}><Text style={styles.hint}>¿Eliminar esta frase?</Text><Pressable accessibilityRole="button" disabled={saving} onPress={() => remove(note.id)} style={styles.link}><Text style={styles.linkText}>Eliminar</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeleteId(null)} style={styles.link}><Text style={styles.linkText}>Cancelar</Text></Pressable></View> : <Pressable accessibilityRole="button" accessibilityLabel="Eliminar frase" onPress={() => setDeleteId(note.id)} style={styles.link}><Text style={styles.linkText}>Eliminar</Text></Pressable>}</View>)}</View></ScrollView>;
  async function finishConfidence() {
    if (saving) return;
    setSaving(true); setError('');
    try {
      await api.wellbeingComplete({ id: completionId.current, kind: 'confidence', duration_seconds: 0 });
      setStep(questions.length);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la práctica.'); }
    finally { setSaving(false); }
  }
  const current = questions[step];
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}><View style={styles.container}><Back onPress={step < 0 ? onBack : () => setStep(step - 1)} /><Text style={styles.eyebrow}>CONFIANZA · 3 MIN APROX.</Text>{step === -1 ? <><Text style={styles.title}>Mi evidencia de confianza.</Text><Text style={styles.lead}>Recuerda una experiencia propia y descubre las capacidades que ya has puesto en práctica. No hay respuestas correctas.</Text><View style={styles.card}><Text style={styles.label}>Un paso a la vez</Text><Text style={styles.hint}>Busca un momento tranquilo. Si usas el dictado, el audio se envía para su transcripción.</Text><Button label="Empezar actividad" onPress={() => { completionId.current = `confidence-${Date.now()}-${Math.random().toString(36).slice(2)}`; setStep(0); }} /></View></> : step === questions.length ? <><Text style={styles.title}>Esto también habla de ti.</Text><Text style={styles.lead}>Has llegado hasta aquí con tus propias herramientas. Puedes volver a esta idea cuando la necesites.</Text><View style={styles.card}><Text style={styles.label}>Tu frase</Text><Text style={styles.summary}>{answers[2]}</Text>{answers[3].trim() ? <><Text style={[styles.label, { marginTop: 22 }]}>Para una entrevista</Text><Text style={styles.hint}>{answers[3]}</Text></> : null}</View><Button label="Volver a actividades" onPress={onBack} /></> : <><Text style={styles.progress}>PASO {step + 1} DE 4</Text><Text style={styles.title}>{current.title}</Text><Text style={styles.lead}>{current.text}</Text><View style={styles.card}><TextInput key={step} accessibilityLabel={current.title} multiline value={answers[step]} onChangeText={value => setAnswers(previous => previous.map((answer, index) => index === step ? value : answer))} placeholder={current.placeholder} placeholderTextColor={colors.subtleText} style={styles.input} maxLength={1000} /><Text style={styles.private}>Si usas el dictado, el audio se envía para su transcripción. Al terminar se registra solo la práctica completada.</Text>{!!error && <Text accessibilityRole="alert">{error}</Text>}<Button label={step === 3 ? 'Ver mi reflexión' : 'Continuar'} disabled={saving || (step < 3 && !answers[step].trim())} onPress={() => step === 3 ? void finishConfidence() : setStep(step + 1)} /></View></>}</View></ScrollView>;
}
function Back({ onPress }: { onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.back}><Text style={styles.linkText}>←  Volver</Text></Pressable>; }
function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}  ↗</Text></Pressable>; }
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({ page: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', backgroundColor: colors.ivory }, container: { width: '100%', maxWidth: 680 }, back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginBottom: 18 }, eyebrow: { color: colors.plum, fontWeight: '700', fontSize: 10, letterSpacing: 1.5, marginBottom: 15 }, title: { color: colors.eggplant, fontFamily: serif, fontSize: 38, lineHeight: 44, letterSpacing: -1 }, lead: { color: colors.mutedText, fontSize: 15, lineHeight: 24, marginTop: 14 }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 22, marginTop: 26 }, label: { color: colors.eggplant, fontSize: 16, fontWeight: '700', lineHeight: 22 }, hint: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 8 }, input: { color: colors.eggplant, fontSize: 16, lineHeight: 23, minHeight: 130, padding: 15, marginTop: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.ivory, textAlignVertical: 'top' }, private: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 12 }, button: { marginTop: 20, minHeight: 54, borderRadius: 14, backgroundColor: colors.plum, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.45 }, buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 }, section: { color: colors.plum, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginTop: 35, marginBottom: 14 }, empty: { padding: 24, backgroundColor: colors.lavenderSurface, borderRadius: 16 }, emptyText: { color: colors.mutedText, fontSize: 14, lineHeight: 22 }, note: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 20, marginBottom: 12 }, quote: { color: colors.lavender, fontFamily: serif, fontSize: 40, lineHeight: 40 }, noteText: { color: colors.eggplant, fontFamily: serif, fontSize: 21, lineHeight: 29 }, date: { color: colors.mutedText, fontSize: 12, marginTop: 15 }, link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 14 }, linkText: { color: colors.plum, fontSize: 14, fontWeight: '600' }, deleteRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, error: { color: colors.eggplant, fontSize: 14, lineHeight: 22 }, progress: { color: colors.mutedText, fontSize: 11, letterSpacing: 1, marginBottom: 12 }, summary: { color: colors.eggplant, fontFamily: serif, fontSize: 24, lineHeight: 32, marginTop: 12 } });
