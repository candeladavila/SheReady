import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ages, goals, sectors, times } from '../../screens/OnboardingScreen';
import type { ProfileDocument } from '../../services/profileDocument';
import { colors } from '../../theme/colors';

type Field = 'goals' | 'age_range' | 'daily_time_choice' | 'sector';
const fields: { key: Field; label: string; options: string[] }[] = [
  { key: 'goals', label: 'Objetivos', options: goals.map(item => item.label) },
  { key: 'age_range', label: 'Edad', options: ages },
  { key: 'daily_time_choice', label: 'Tu ritmo', options: times.map(item => item.label) },
  { key: 'sector', label: 'Sector', options: sectors },
];
const empty = (): ProfileDocument => ({ schema_version: 1, created_at: new Date().toISOString(), completed: false, goals: [], age_range: null, daily_time_choice: null, daily_minutes: null, sector: null });
export default function ProfileOnboardingFields({ document, onSave }: { document: ProfileDocument | null; onSave: (document: ProfileDocument) => Promise<void> }) {
  const [draft, setDraft] = useState<ProfileDocument>(() => document ?? empty());
  const [open, setOpen] = useState<Field | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!dirty) setDraft(document ?? empty()); }, [document, dirty]);
  const change = (field: Field, value: string) => {
    setSaved(false); setError(''); setDirty(true);
    setDraft(previous => field === 'goals'
      ? { ...previous, goals: previous.goals.includes(value) ? previous.goals.filter(item => item !== value) : [...previous.goals, value] }
      : field === 'daily_time_choice'
        ? { ...previous, daily_time_choice: value, daily_minutes: Number.parseInt(value, 10) || null }
        : { ...previous, [field]: value });
    if (field !== 'goals') setOpen(null);
  };
  async function save() {
    if (saving) return;
    setSaving(true); setError('');
    try { await onSave(draft); setDirty(false); setSaved(true); setOpen(null); }
    catch { setError('No se ha podido guardar tu información. Inténtalo de nuevo.'); }
    finally { setSaving(false); }
  }
  return <View style={styles.card}>
    {fields.map(field => {
      const value = field.key === 'goals' ? draft.goals.join(', ') : draft[field.key];
      return <View key={field.key} style={styles.field}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${field.label}: ${value || 'Sin indicar'}`} accessibilityState={{ expanded: open === field.key, disabled: saving }} disabled={saving} onPress={() => setOpen(open === field.key ? null : field.key)} style={styles.row}>
          <Text style={styles.label}>{field.label}</Text><Text style={styles.value}>{value || 'Sin indicar'}</Text><Text style={styles.arrow}>{open === field.key ? '⌃' : '⌄'}</Text>
        </Pressable>
        {open === field.key && <View style={styles.options}>{field.key === 'goals' && <Text style={styles.hint}>Puedes elegir varios objetivos.</Text>}{field.options.map(option => {
          const selected = field.key === 'goals' ? draft.goals.includes(option) : draft[field.key] === option;
          return <Pressable key={option} accessibilityRole={field.key === 'goals' ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} onPress={() => change(field.key, option)} style={[styles.option, selected && styles.selected]}><Text style={[styles.optionText, selected && styles.selectedText]}>{option}</Text><Text style={styles.indicator}>{selected ? '✓' : ''}</Text></Pressable>;
        })}</View>}
      </View>;
    })}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {saved && !dirty ? <Text accessibilityLiveRegion="polite" style={styles.success}>Información guardada.</Text> : null}
    {dirty && <View style={styles.actions}><Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.disabled]}><Text style={styles.saveText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={() => { setDraft(document ?? empty()); setDirty(false); setOpen(null); setError(''); }} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></Pressable></View>}
  </View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, marginTop: 14, paddingHorizontal: 20, paddingVertical: 6 }, field: { borderBottomWidth: 1, borderBottomColor: colors.border }, row: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10 }, label: { color: colors.eggplant, fontWeight: '700', width: 100, fontSize: 13 }, value: { color: colors.plum, fontSize: 13, flex: 1, lineHeight: 19 }, arrow: { color: colors.plum, fontSize: 20 }, options: { gap: 6, paddingBottom: 12 }, option: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.ivory, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, selected: { backgroundColor: colors.lavenderSurface }, optionText: { color: colors.eggplant, fontSize: 14, flexShrink: 1 }, selectedText: { color: colors.plum, fontWeight: '700' }, indicator: { color: colors.plum, fontWeight: '700' }, hint: { color: colors.mutedText, fontSize: 12, marginBottom: 4 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 14 }, save: { minHeight: 44, paddingHorizontal: 18, backgroundColor: colors.plum, borderRadius: 11, justifyContent: 'center', alignItems: 'center' }, saveText: { color: colors.white, fontWeight: '700' }, cancel: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }, cancelText: { color: colors.plum, fontWeight: '700' }, disabled: { opacity: 0.6 }, error: { color: '#9A3434', fontSize: 13, marginTop: 12 }, success: { color: colors.plum, fontSize: 13, marginTop: 12 } });
