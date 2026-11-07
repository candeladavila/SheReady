import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ProfileDocument } from '../services/profileDocument';
import { colors } from '../theme/colors';
import { sectorIllustration } from '../constants/sectorIllustrations';

type Option = { label: string; detail?: string; icon?: string };
const goals: Option[] = [
  { label: 'Encontrar empleo', detail: 'Dar dirección a mi búsqueda', icon: '⌕' },
  { label: 'Mejorar mi CV', detail: 'Contar mejor lo que sé hacer', icon: '▤' },
  { label: 'Preparar entrevistas', detail: 'Practicar cómo presentarme', icon: '▱' },
  { label: 'Cambiar de sector', detail: 'Explorar un nuevo rumbo', icon: '☷' },
  { label: 'Recuperar confianza', detail: 'Reconocer mi valor profesional', icon: '☼' },
];
const ages = ['Menos de 25', '25–34 años', '35–44 años', '45–54 años', '55 años o más', 'Prefiero no decirlo'];
const times: Option[] = [
  { label: '5 minutos', detail: 'Una acción pequeña para empezar' },
  { label: '10 minutos', detail: 'Un ejercicio breve y un paso práctico' },
  { label: '20 minutos', detail: 'Más espacio para practicar y explorar' },
  { label: 'Iré día a día', detail: 'Prefiero decidir sobre la marcha' },
];
const sectors = ['Tecnología', 'Marketing', 'Finanzas', 'Educación y salud', 'Comercio y servicios', 'Otro sector', 'Aún no lo sé'];
const purple = colors.plum;
const sage = colors.sage;

export default function OnboardingScreen({ onComplete, onSkip, startAtForm = false }: { onComplete: (document: ProfileDocument) => Promise<void>; onSkip: (document: ProfileDocument) => Promise<void>; startAtForm?: boolean }) {
  const [page, setPage] = useState(startAtForm ? 2 : 1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [age, setAge] = useState('');
  const [time, setTime] = useState('');
  const [sector, setSector] = useState('Tecnología');
  const { width } = useWindowDimensions();
  const isTouchLayout = Platform.OS !== 'web' || width < 760;
  const toggleGoal = (goal: string) => setSelectedGoals(current => current.includes(goal) ? current.filter(item => item !== goal) : [...current, goal]);
  const goNext = () => setPage(current => Math.min(current + 1, 6));
  const isDisabled = (page === 2 && selectedGoals.length === 0) || (page === 4 && !time) || (page === 5 && !sector);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  async function finish(completed: boolean) {
    if (saving) return;
    setSaving(true); setSaveError('');
    const minutes = Number.parseInt(time, 10);
    const document: ProfileDocument = { schema_version: 1, created_at: new Date().toISOString(), completed, goals: selectedGoals, age_range: age || null, daily_time_choice: time || null, daily_minutes: Number.isFinite(minutes) ? minutes : null, sector: page >= 5 ? sector : null };
    try { await (completed ? onComplete(document) : onSkip(document)); }
    catch { setSaveError('No se pudo guardar tu perfil en este dispositivo. Inténtalo de nuevo.'); }
    finally { setSaving(false); }
  }
  const next = () => page === 6 ? void finish(true) : goNext();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />{saveError ? <Text accessibilityRole="alert" style={styles.helper}>{saveError}</Text> : null}
      {page === 1 ? (
        <ScrollView contentContainerStyle={styles.intro}>
          <View style={styles.introHeader}><Text style={styles.brand}>She ready</Text><Pressable accessibilityRole="button" onPress={() => void finish(false)} hitSlop={8} style={styles.skip}><Text style={styles.skipText}>Saltar</Text></Pressable></View>
          <View style={styles.hero}><Text style={styles.heroEyebrow}>NO TIENES QUE TENERLO TODO CLARO.</Text><Text style={styles.heroTitle}>Un paso.</Text><Text style={[styles.heroTitle, styles.heroItalic]}>Y otro.</Text><View style={styles.heroLast}><Text style={[styles.heroTitle, { color: sage }]}>A tu ritmo.</Text><Text style={styles.limeArrow}>↗</Text></View></View>
          <Text style={styles.introTitle}>Tu próximo capítulo,{'\n'}con compañía.</Text>
          <Text style={styles.description}>Ejercicios diarios, noticias relevantes y práctica de entrevistas con IA por voz para que avances con claridad y confianza.</Text>
          <View style={styles.bullets}><Text style={styles.bulletText}>• Ejercicios diarios para avanzar poco a poco.{'\n'}• Noticias que te ayudan a entender el mercado.{'\n'}• Práctica de entrevistas con IA por voz para sentirte más segura.</Text></View>
          <View style={styles.introFooter}><Action label="Crear mi plan" onPress={goNext} /><Text style={styles.helper}>5 pasos breves. Tú decides qué compartir.</Text></View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => setPage(page - 1)} hitSlop={12}><Text style={styles.back}>←</Text></Pressable><Text style={styles.brand}>She ready</Text><View style={styles.headerRight}><Text style={styles.counter}>{page - 1} de 5</Text><Pressable accessibilityRole="button" onPress={() => void finish(false)} hitSlop={8} style={styles.skip}><Text style={styles.skipText}>Saltar</Text></Pressable></View></View>
          <View style={styles.progress}>{[0, 1, 2, 3, 4].map(i => <View key={i} style={[styles.progressPart, i < page - 1 && styles.progressActive]} />)}</View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {page === 2 && <><Heading eyebrow="TU PUNTO DE PARTIDA" title={'¿Qué necesitas\nhoy?'} description="Elige uno o varios objetivos. Empezaremos por lo que más te importa." /><View style={styles.options}>{goals.map(option => <Choice key={option.label} option={option} selected={selectedGoals.includes(option.label)} multiple onPress={() => toggleGoal(option.label)} />)}</View></>}
            {page === 3 && <><Heading eyebrow="UN POCO SOBRE TI · OPCIONAL" title={'¿En qué rango\nde edad estás?'} description="Nos ayuda a adaptar los ejemplos y el acompañamiento a tu momento vital." /><View style={styles.grid}>{ages.map((label, i) => <View key={label} style={i < 4 ? styles.half : styles.full}><Choice option={{ label }} selected={age === label} onPress={() => setAge(label)} /></View>)}</View><Text style={styles.privacy}>♢   Tu edad no se usa para filtrar oportunidades.</Text></>}
            {page === 4 && <><Heading eyebrow="UN COMPROMISO POSIBLE" title={'¿Cuánto tiempo\ntienes al día?'} description="Piensa en un día normal, no en uno perfecto. Un poco también cuenta." /><View style={styles.options}>{times.map(option => <Choice key={option.label} option={option} selected={time === option.label} onPress={() => setTime(option.label)} />)}</View><View style={styles.tip}><Text style={styles.tipText}>↗    El mejor ritmo es el que cabe en tu vida.</Text></View></>}
            {page === 5 && <><View style={styles.sectorHeader}><View style={styles.sectorHeaderText}><Heading eyebrow="TU DIRECCIÓN, POR AHORA" title={'¿Qué sector\nte interesa?'} description="Elige tu principal interés para adaptar los ejemplos y ejercicios de tu plan." /></View>{sectorIllustration(sector) && <Image source={sectorIllustration(sector)} style={[styles.sectorHeaderImage, !isTouchLayout && styles.sectorHeaderImageWeb]} resizeMode="contain" accessible={false} />}</View><View style={styles.grid}>{sectors.map((label, i) => <SectorChoice key={label} label={label} half={i < 4} selected={sector === label} onPress={() => setSector(label)} />)}</View></>}
            {page === 6 && <><Heading eyebrow="TU PLAN INICIAL" title={'Un punto de partida.\nMucho por delante.'} description="Tu plan combina ejercicios diarios, noticias relevantes y práctica de entrevistas con IA por voz." /><View style={styles.planCard}><View style={styles.planTop}><Text style={styles.planTitle}>{time === 'Iré día a día' ? 'A tu ritmo' : `${time.replace('minutos', 'min')} al día`}</Text><Text style={styles.limeArrow}>↗</Text></View><View style={styles.planDivider} /><Text style={styles.planMeta}>{sector}{age && age !== 'Prefiero no decirlo' ? ` · ${age}` : ''} · Ejercicios diarios, noticias y práctica de entrevistas con IA por voz</Text><Text style={styles.planGoals}>{selectedGoals.join(' + ')}</Text></View><Text style={styles.sectionLabel}>LAS SECCIONES DE TU PLAN</Text>{[['01', 'Ejercicios diarios', `Hoy · ${time} · Comienza con un ejercicio breve para enfocar tu búsqueda.`], ['02', 'Noticias', 'Después · Accede a noticias relevantes para mantenerte al día en tu sector.'], ['03', 'Práctica de entrevistas con IA por voz', 'Después · Practica entrevistas con IA por voz para sentirte más segura.']].map(([number, title, description]) => <View style={styles.planRow} key={number}><Text style={styles.number}>{number}</Text><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDescription}>{description}</Text></View></View>)}</>}
          </ScrollView>
          <View style={styles.footer}><Action label={page === 2 ? `Continuar con ${selectedGoals.length} ${selectedGoals.length === 1 ? 'objetivo' : 'objetivos'}` : page === 6 ? (saving ? 'Guardando…' : 'Guardar mi plan y continuar') : 'Continuar'} onPress={next} disabled={isDisabled || saving} /><Text style={styles.helper}>{page === 2 ? 'Podrás cambiar tus objetivos más adelante.' : page === 3 ? 'Este dato es opcional.' : page === 4 ? 'Sin rachas ni presión. Puedes ajustar tu ritmo.' : page === 5 ? 'Elegir un sector no limita tus oportunidades.' : 'Tu plan puede cambiar contigo.'}</Text></View>
        </>
      )}
    </View>
  );
}

function SectorChoice({ label, half, selected, onPress }: { label: string; half: boolean; selected: boolean; onPress: () => void }) {
  return <View style={half ? styles.half : styles.full}><Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}><View style={styles.choiceText}><Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text></View><View style={[styles.indicator, selected && styles.indicatorSelected]}>{selected && <View style={styles.radioDot} />}</View></Pressable></View>;
}

function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <View style={styles.headingBlock}><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.heading}>{title}</Text><Text style={styles.description}>{description}</Text></View>; }
function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{label}</Text><Text style={styles.buttonArrow}>→</Text></Pressable>; }
function Choice({ option, selected, multiple = false, onPress }: { option: Option; selected: boolean; multiple?: boolean; onPress: () => void }) { return <Pressable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>{option.icon && <Text style={styles.choiceIcon}>{option.icon}</Text>}<View style={styles.choiceText}><Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{option.label}</Text>{option.detail && <Text style={styles.choiceDetail}>{option.detail}</Text>}</View><View style={[styles.indicator, multiple && styles.checkbox, selected && styles.indicatorSelected]}>{selected && (multiple ? <Text style={styles.check}>✓</Text> : <View style={styles.radioDot} />)}</View></Pressable>; }

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  sectorHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, sectorHeaderText: { flex: 1, minWidth: 0 }, sectorHeaderImage: { width: 105, height: 145 }, sectorHeaderImageWeb: { width: 240, height: 240 },
  root: { flex: 1, backgroundColor: colors.ivory, paddingTop: Platform.OS === 'web' ? 24 : 55 },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, skipText: { color: colors.plum, fontSize: 14, fontWeight: '600' }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limeArrow: { color: colors.coral, fontSize: 30, lineHeight: 34 },
  intro: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 36 }, introHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, brand: { color: colors.eggplant, fontFamily: serif, fontSize: 24, letterSpacing: -1 }, smallCaps: { color: colors.mutedText, fontSize: 11, letterSpacing: 1.5 }, hero: { backgroundColor: purple, borderRadius: 18, paddingHorizontal: 23, paddingTop: 23, paddingBottom: 42, marginBottom: 24 }, heroEyebrow: { color: colors.lightText, fontSize: 9, letterSpacing: 1.8, marginBottom: 3 }, heroTitle: { color: colors.ivory, fontFamily: serif, fontSize: 49, lineHeight: 58, letterSpacing: -2.5 }, heroItalic: { textAlign: 'right', fontStyle: 'italic' }, heroLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, introTitle: { color: colors.eggplant, fontFamily: serif, fontSize: 37, lineHeight: 42, letterSpacing: -1.6, marginBottom: 14 }, description: { color: colors.mutedText, fontSize: 15, lineHeight: 23 }, bullets: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 15, paddingTop: 15 }, bulletText: { color: colors.eggplant, fontSize: 14, lineHeight: 21 }, introFooter: { marginTop: 'auto', paddingTop: 26 },
  header: { height: 45, paddingHorizontal: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, back: { color: colors.eggplant, fontSize: 25, width: 80 }, counter: { color: colors.mutedText, fontSize: 12, textAlign: 'right' }, progress: { flexDirection: 'row', gap: 5, paddingHorizontal: 26, marginTop: 17, marginBottom: 28 }, progressPart: { height: 4, flex: 1, backgroundColor: colors.border, borderRadius: 3 }, progressActive: { backgroundColor: sage }, content: { flexGrow: 1, paddingHorizontal: 26, paddingBottom: 20 }, headingBlock: { marginBottom: 25 }, eyebrow: { color: colors.mutedText, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }, heading: { fontFamily: serif, fontSize: 39, lineHeight: 42, letterSpacing: -1.8, color: colors.eggplant, marginBottom: 15 }, options: { gap: 9 }, choice: { minHeight: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 }, choiceSelected: { backgroundColor: colors.sageSurface, borderColor: purple, borderWidth: 1.5 }, choiceIcon: { color: colors.eggplant, fontSize: 25, width: 34 }, choiceText: { flex: 1, paddingRight: 8 }, choiceLabel: { color: colors.eggplant, fontSize: 15, lineHeight: 19 }, choiceLabelSelected: { fontWeight: '600' }, choiceDetail: { color: colors.mutedText, fontSize: 12, marginTop: 3, lineHeight: 16 }, indicator: { width: 22, height: 22, borderWidth: 1.3, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, checkbox: { borderRadius: 5 }, indicatorSelected: { backgroundColor: purple, borderColor: purple }, radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: sage }, check: { color: colors.white, fontSize: 15, fontWeight: 'bold', lineHeight: 19 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, half: { width: '48.8%', flexGrow: 1 }, full: { width: '100%' }, privacy: { color: colors.mutedText, fontSize: 12, marginTop: 23 }, tip: { backgroundColor: colors.lavenderSurface, padding: 15, borderRadius: 17, marginTop: 24 }, tipText: { color: colors.eggplant, fontSize: 13 },
  footer: { paddingHorizontal: 26, paddingTop: 8, paddingBottom: Platform.OS === 'web' ? 25 : 43, backgroundColor: colors.ivory }, button: { backgroundColor: purple, minHeight: 57, borderRadius: 14, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, buttonText: { color: colors.ivory, fontSize: 16, fontWeight: '600', flexShrink: 1 }, buttonArrow: { color: colors.ivory, fontSize: 24, marginLeft: 10 }, disabled: { opacity: 0.5 }, pressed: { opacity: 0.75 }, helper: { color: colors.mutedText, textAlign: 'center', fontSize: 12, marginTop: 12 },
  planCard: { backgroundColor: purple, borderRadius: 18, padding: 20, marginBottom: 25 }, planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, planTitle: { fontFamily: serif, fontSize: 32, letterSpacing: -1.5, color: colors.ivory }, planDivider: { height: 1, backgroundColor: colors.lightBorder, marginVertical: 15 }, planMeta: { color: colors.lightText, fontSize: 12, lineHeight: 16 }, planGoals: { color: colors.ivory, fontSize: 14, lineHeight: 20, marginTop: 15 }, sectionLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, marginBottom: 12 }, planRow: { flexDirection: 'row', gap: 14, marginBottom: 12 }, number: { color: colors.eggplant, backgroundColor: colors.lavenderSurface, width: 30, height: 30, borderRadius: 15, overflow: 'hidden', textAlign: 'center', lineHeight: 30, fontSize: 12, fontWeight: '600' }, rowText: { flex: 1 }, rowTitle: { color: colors.eggplant, fontWeight: '600', fontSize: 14, lineHeight: 19 }, rowDescription: { color: colors.mutedText, fontSize: 12, lineHeight: 17, marginTop: 2 }, completed: { flex: 1, justifyContent: 'center', paddingHorizontal: 26, gap: 20 },
});
