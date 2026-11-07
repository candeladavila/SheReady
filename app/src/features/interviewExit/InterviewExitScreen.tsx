import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { colors } from '../../theme/colors';

const faces = [
  { value: 1, label: 'Muy insatisfecha', image: require('../../assets/interview-exit/satisfaction-1.png') },
  { value: 2, label: 'Insatisfecha', image: require('../../assets/interview-exit/satisfaction-2.png') },
  { value: 3, label: 'Neutral', image: require('../../assets/interview-exit/satisfaction-3.png') },
  { value: 4, label: 'Satisfecha', image: require('../../assets/interview-exit/satisfaction-4.png') },
  { value: 5, label: 'Muy satisfecha', image: require('../../assets/interview-exit/satisfaction-5.png') },
] as const;
const checkpoints = [
  { id: 'explained_experience', label: 'Expliqué mi experiencia o trayectoria' },
  { id: 'gave_example', label: 'Compartí un ejemplo concreto' },
  { id: 'asked_question', label: 'Hice alguna pregunta' },
  { id: 'discussed_role', label: 'Hablé sobre el puesto o sus funciones' },
  { id: 'explained_interest', label: 'Expliqué mi interés por la oportunidad' },
] as const;
type Checkpoint = (typeof checkpoints)[number]['id'];
export type InterviewExitReflection = { satisfaction: 1 | 2 | 3 | 4 | 5; checkpoints: Checkpoint[]; reflection: string };
export default function InterviewExitScreen({ interviewId, onFinish }: { interviewId: string; onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const [satisfaction, setSatisfaction] = useState<InterviewExitReflection['satisfaction'] | null>(null);
  const [selected, setSelected] = useState<Checkpoint[]>([]);
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const width = useWindowDimensions().width;
  const faceSize = Math.max(42, Math.min(76, (width - 112) / 5));
  const save = async () => {
    if (satisfaction === null || saving) return;
    setSaving(true); setError('');
    const data: InterviewExitReflection = { satisfaction, checkpoints: selected, reflection: reflection.trim() };
    try { await AsyncStorage.setItem(`@sheready/interview-exit/${interviewId}`, JSON.stringify(data)); onFinish(); }
    catch { setError('No se han podido guardar tus respuestas. Inténtalo de nuevo.'); }
    finally { setSaving(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}><View style={styles.content}>
    <Text style={styles.eyebrow}>UN MOMENTO PARA REFLEXIONAR · {page + 1} DE 3</Text>
    {page === 0 && <><Text style={styles.title}>¿Cómo te has sentido?</Text><Text style={styles.copy}>Elige la expresión que mejor refleje tu satisfacción con la entrevista.</Text><View accessibilityRole="radiogroup" style={styles.faces}>{faces.map(face => <Pressable key={face.value} accessibilityRole="radio" accessibilityLabel={face.label} accessibilityState={{ checked: satisfaction === face.value }} onPress={() => setSatisfaction(face.value)} style={[styles.face, satisfaction === face.value && styles.faceSelected]}><Image source={face.image} style={{ width: faceSize, height: faceSize }} resizeMode="contain" accessible={false} /></Pressable>)}</View><Text style={styles.hint}>{faces.find(face => face.value === satisfaction)?.label ?? 'Selecciona una opción para continuar.'}</Text><Button label="Continuar" disabled={satisfaction === null} onPress={() => setPage(1)} /></>}
    {page === 1 && <><Text style={styles.title}>¿Qué hiciste durante la entrevista?</Text><Text style={styles.copy}>Marca solo las acciones que recuerdes haber realizado. Puedes dejar todas sin marcar.</Text><View style={styles.list}>{checkpoints.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(item.id) }} onPress={() => setSelected(previous => previous.includes(item.id) ? previous.filter(value => value !== item.id) : [...previous, item.id])} style={styles.option}><Text style={styles.optionText}>{item.label}</Text><View style={[styles.checkbox, selected.includes(item.id) && styles.checked]}>{selected.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}</View></Pressable>)}</View><Button label="Continuar" onPress={() => setPage(2)} /><Button label="Volver" secondary onPress={() => setPage(0)} /></>}
    {page === 2 && <><Text style={styles.title}>¿Algo más que quieras recordar?</Text><Text style={styles.copy}>Si te apetece, anota cómo fue la experiencia o qué te gustaría tener presente. Este paso es opcional.</Text><TextInput accessibilityLabel="Reflexiones personales" multiline maxLength={4000} textAlignVertical="top" value={reflection} onChangeText={setReflection} placeholder="Escribe tus reflexiones aquí…" placeholderTextColor={colors.subtleText} style={styles.input} /><Text style={styles.hint}>Se guarda en este dispositivo.</Text>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Button label={saving ? 'Guardando…' : 'Guardar y continuar'} disabled={saving} onPress={save} /><Button label="Volver" secondary disabled={saving} onPress={() => setPage(1)} /></>}
  </View></ScrollView>;
}
function Button({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>; }
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({ page: { flexGrow: 1, backgroundColor: colors.ivory, padding: 24, justifyContent: 'center', alignItems: 'center' }, content: { width: '100%', maxWidth: 680 }, eyebrow: { color: colors.plum, fontSize: 10, letterSpacing: 1.3, fontWeight: '700', marginBottom: 18 }, title: { color: colors.eggplant, fontFamily: serif, fontSize: 37, lineHeight: 44 }, copy: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 14 }, faces: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 30 }, face: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 6 }, faceSelected: { borderColor: colors.plum, borderWidth: 2, backgroundColor: colors.lavenderSurface }, hint: { color: colors.mutedText, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 12 }, list: { gap: 10, marginTop: 26 }, option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 58, padding: 16, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }, optionText: { color: colors.eggplant, flex: 1, fontSize: 14, lineHeight: 21 }, checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: colors.plum, borderColor: colors.plum }, checkmark: { color: colors.white, fontWeight: '700' }, input: { minHeight: 160, marginTop: 25, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, fontSize: 16, color: colors.eggplant }, button: { minHeight: 54, borderRadius: 14, marginTop: 20, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center', padding: 14 }, buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 }, secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 10 }, secondaryText: { color: colors.plum }, disabled: { opacity: 0.5 }, error: { color: '#9A3434', marginTop: 12, fontSize: 14 } });
