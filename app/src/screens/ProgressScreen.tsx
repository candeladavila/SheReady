import { Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { sectorIllustration } from '../constants/sectorIllustrations';
import { colors } from '../theme/colors';

type Milestone = { title: string; description: string; completed: number; total: number; unit: string };
const milestones: Milestone[] = [
  { title: 'Cada práctica cuenta', description: 'Date espacio para ensayar y ganar soltura.', completed: 2, total: 4, unit: 'entrevistas de práctica' },
  { title: 'Un momento para ti', description: 'Dedica unos minutos a cuidarte y respirar.', completed: 3, total: 5, unit: 'actividades de bienestar' },
  { title: 'Reconoce tu camino', description: 'Pon en valor todo lo que ya has conseguido.', completed: 1, total: 3, unit: 'reflexiones completadas' },
];

function Staircase({ completed, total }: { completed: number; total: number }) {
  return <View style={styles.steps} accessible={false}>
    {Array.from({ length: total }, (_, i) => <View key={i} style={[styles.step, { height: 34 + i * 16 }, i < completed ? styles.stepDone : styles.stepPending]}>
      <Text style={[styles.stepNumber, i < completed && styles.stepNumberDone]}>{i < completed ? '✓' : i + 1}</Text>
    </View>)}
    <Svg style={styles.flag} width={25} height={30} viewBox="0 0 24 28" fill="none"><Path d="M5 25V3m1 1h13l-4 5 4 5H6" stroke={colors.coral} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
  </View>;
}

export default function ProgressScreen({ selectedSector }: { selectedSector?: string }) {
  const wide = useWindowDimensions().width >= 900;
  const illustration = sectorIllustration(selectedSector || 'Tecnología', 'progreso');
  return <ScrollView contentContainerStyle={styles.page}><View style={styles.content}>
    <View style={styles.header}><View style={styles.headerText}><Text style={styles.eyebrow}>TU CAMINO, A TU RITMO</Text><Text style={styles.title}>Cada paso suma.</Text><Text style={styles.lead}>Mira todo lo que estás construyendo, un escalón a la vez.</Text><View style={styles.demo}><Text style={styles.demoText}>PROGRESO DE EJEMPLO</Text></View></View>{illustration && <Image source={illustration} style={[styles.illustration, wide && styles.illustrationWide]} resizeMode="contain" accessible={false} />}</View>
    <View style={styles.intro}><Text style={styles.eyebrow}>CELEBRA TU RECORRIDO</Text><Text style={styles.sectionTitle}>Mis logros</Text><Text style={styles.sectionCopy}>Cada pequeño avance merece ser reconocido.</Text></View>
    <View style={[styles.cards, wide && styles.cardsWide]}>{milestones.map(item => <View key={item.title} style={[styles.card, wide && styles.cardWide]}>
      <View style={styles.cardHeading}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.count}>{item.completed} / {item.total}</Text></View>
      <Text style={styles.description}>{item.description}</Text><Staircase completed={item.completed} total={item.total} />
      <Text style={styles.caption}>{item.completed} de {item.total} {item.unit}</Text>
    </View>)}</View>
    <View style={styles.encouragement}><Text style={styles.encouragementTitle}>Tu ritmo también es progreso.</Text><Text style={styles.encouragementCopy}>Lo importante es seguir construyendo tu propio camino, paso a paso.</Text></View>
  </View></ScrollView>;
}
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: colors.ivory, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 48, alignItems: 'center' }, content: { width: '100%', maxWidth: 1500 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, headerText: { flex: 1, minWidth: 0 }, eyebrow: { color: colors.plum, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 }, title: { color: colors.eggplant, fontFamily: serif, fontSize: 39, lineHeight: 45 }, lead: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 620 }, illustration: { width: 110, height: 155 }, illustrationWide: { width: 210, height: 230 }, demo: { alignSelf: 'flex-start', backgroundColor: colors.lavenderSurface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginTop: 17 }, demoText: { color: colors.plum, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  intro: { marginTop: 36 }, sectionTitle: { color: colors.eggplant, fontFamily: serif, fontSize: 32, lineHeight: 38 }, sectionCopy: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 7 }, cards: { gap: 14, marginTop: 20 }, cardsWide: { flexDirection: 'row', flexWrap: 'wrap' }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 22 }, cardWide: { flexBasis: '30%', flexGrow: 1, minWidth: 260 }, cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, cardTitle: { flexShrink: 1, color: colors.eggplant, fontFamily: serif, fontSize: 24, lineHeight: 29 }, count: { overflow: 'hidden', backgroundColor: colors.lavenderSurface, borderRadius: 15, paddingVertical: 6, paddingHorizontal: 10, color: colors.plum, fontSize: 12, fontWeight: '700' }, description: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 9 }, steps: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 22, marginTop: 14, position: 'relative' }, step: { flex: 1, maxWidth: 80, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 7, borderTopRightRadius: 7, paddingTop: 8 }, stepDone: { backgroundColor: colors.plum }, stepPending: { backgroundColor: colors.lavenderSurface }, stepNumber: { color: colors.plum, fontSize: 12, fontWeight: '700' }, stepNumberDone: { color: colors.white }, flag: { position: 'absolute', right: 2, top: 0 }, caption: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 12 }, encouragement: { marginTop: 24, padding: 22, borderRadius: 20, backgroundColor: colors.sageSurface }, encouragementTitle: { color: colors.eggplant, fontFamily: serif, fontSize: 25, lineHeight: 31 }, encouragementCopy: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 7 },
});
