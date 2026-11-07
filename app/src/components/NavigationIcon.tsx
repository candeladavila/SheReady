import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

export type NavigationIconName = 'home' | 'practice' | 'activities' | 'news' | 'progress' | 'profile';

export default function NavigationIcon({ name, active }: { name: NavigationIconName; active: boolean }) {
  const color = active ? colors.plum : colors.mutedText;
  return <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {name === 'home' && <><Path d="M3 10.5 12 3l9 7.5" /><Path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>}
    {name === 'practice' && <><Rect x="8" y="3" width="8" height="12" rx="4" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3m-3 0h6" /></>}
    {name === 'activities' && <><Circle cx="12" cy="12" r="8" /><Path d="M8 13c1-3 3-4 4-4s3 1 4 4M9 16h6" /></>}
    {name === 'news' && <><Rect x="3" y="4" width="18" height="16" rx="2" /><Path d="M7 8h4v4H7zM14 8h3M14 11h3M7 16h10" /></>}
    {name === 'progress' && <><Path d="M3 21v-5h5v-4h5V8h5V4h3" /><Path d="M3 21h18" /></>}
    {name === 'profile' && <><Circle cx="12" cy="8" r="4" /><Path d="M4 21a8 8 0 0 1 16 0" /></>}
  </Svg>;
}
