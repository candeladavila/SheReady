import Strands from './Strands.web';
import { colors } from '../theme/colors';

export default function VoiceVisualization() {
  return <div style={{ width: '100%', maxWidth: 300, aspectRatio: '1', pointerEvents: 'none' }}><Strands colors={[colors.plum, colors.lavender, colors.coral, colors.sage]} listening interactive={false} /></div>;
}
