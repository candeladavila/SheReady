import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

type ActivityKind = 'breathing' | 'mini' | 'confidence';

export default function ActivityIllustration({ kind }: { kind: ActivityKind }) {
  return <View style={styles.container} accessible={false}>
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={58} fill={kind === 'mini' ? colors.sage : colors.lavender} />
      {kind === 'breathing' && <Circle cx={60} cy={60} r={39} fill={colors.sage} />}
      {kind === 'mini' && <><Rect x={27} y={38} width={66} height={47} rx={9} fill={colors.ivory} /><Path d="M30 43 L60 64 L90 43" stroke={colors.plum} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /><Path d="M60 75 C50 68 45 64 45 59 C45 52 54 50 60 57 C66 50 75 52 75 59 C75 64 70 68 60 75Z" fill={colors.coral} /></>}
      {kind === 'confidence' && <><Circle cx={60} cy={60} r={39} fill={colors.ivory} /><Path d="M60 31 L66 49 L85 49 L70 60 L76 79 L60 68 L44 79 L50 60 L35 49 L54 49 Z" fill={colors.coral} /><Circle cx={92} cy={31} r={4} fill={colors.sage} /><Circle cx={28} cy={88} r={3} fill={colors.sage} /></>}
    </Svg>
  </View>;
}
const styles = StyleSheet.create({ container: { height: 155, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavenderSurface } });
