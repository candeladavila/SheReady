import TextInput from '../../components/DictationInput';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import storage from '../../services/accountStorage';
import type { PlannedActivity } from '../../services/api';
import { colors } from '../../theme/colors';

export default function PersonalizedActivityScreen({ activity, planId, index, onBack }: { activity: PlannedActivity; planId: string; index: number; onBack: () => void }) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState(activity.prompts.map(() => ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function finish() {
    if (busy) return;
    setBusy(true); setError('');
    try { await storage.setItem(`@sheready/personalized/${planId}/${index}`, JSON.stringify({ answers, completedAt: new Date().toISOString() })); setDone(true); }
    catch { setError('No se ha podido guardar tu actividad. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}><View style={styles.content}>
    <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.link}>← Volver a actividades</Text></Pressable>
    {done ? <><Text style={styles.eyebrow}>UN PASO MÁS</Text><Text style={styles.title}>Actividad terminada.</Text><Text style={styles.copy}>Has dedicado un momento a avanzar a tu ritmo.</Text><Pressable accessibilityRole="button" onPress={onBack} style={styles.button}><Text style={styles.buttonText}>Volver a actividades</Text></Pressable></> : <>
      <Text style={styles.eyebrow}>PARA TU ENTREVISTA · {activity.duration_minutes} MIN</Text><Text style={styles.title}>{activity.title}</Text><Text style={styles.copy}>{activity.description}</Text>
      {!started ? <><View style={styles.card}><Text style={styles.heading}>Antes de empezar</Text><Text style={styles.copy}>{activity.objective}</Text>{activity.instructions.map((instruction, i) => <Text key={i} style={styles.item}>{i + 1}. {instruction}</Text>)}</View><Pressable accessibilityRole="button" onPress={() => setStarted(true)} style={styles.button}><Text style={styles.buttonText}>Empezar actividad  ↗</Text></Pressable></> : <><View style={styles.card}>{activity.prompts.map((prompt, i) => <View key={i}><Text style={styles.heading}>{prompt}</Text><TextInput accessibilityLabel={prompt} multiline value={answers[i]} onChangeText={text => setAnswers(current => current.map((value, j) => i === j ? text : value))} placeholder="Escribe aquí lo que quieras compartir…" placeholderTextColor={colors.subtleText} style={styles.input} /></View>)}</View><Text style={styles.copy}>Tus respuestas se guardan en este dispositivo.</Text>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Pressable accessibilityRole="button" disabled={busy} onPress={() => void finish()} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Guardando…' : 'Terminar actividad  ↗'}</Text></Pressable></>}
    </>}
  </View></ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 24, backgroundColor: colors.ivory, alignItems: 'center' }, content: { width: '100%', maxWidth: 720 }, back: { minHeight: 44, justifyContent: 'center', marginBottom: 20 }, link: { color: colors.plum, fontWeight: '700' }, eyebrow: { color: colors.plum, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 14 }, title: { color: colors.eggplant, fontSize: 34, lineHeight: 41, fontFamily: 'Georgia' }, copy: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 14 }, card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 22, gap: 14, marginTop: 24 }, heading: { color: colors.eggplant, fontWeight: '700', fontSize: 16, lineHeight: 23 }, item: { color: colors.mutedText, fontSize: 15, lineHeight: 23 }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.ivory, color: colors.eggplant, minHeight: 100, marginTop: 10, padding: 12, textAlignVertical: 'top' }, button: { backgroundColor: colors.plum, minHeight: 52, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 14, marginTop: 22 }, buttonText: { color: colors.white, fontWeight: '700', textAlign: 'center' }, error: { color: '#9A3434', marginTop: 12 } });
