import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color: string };

export const GridIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    {[0, 1, 2].flatMap(r => [0, 1, 2].map(c => (
      <Rect key={`${r}${c}`} x={3 + c * 6.5} y={3 + r * 6.5} width={5} height={5} rx={1} opacity={r * 3 + c > 4 ? 0.35 : 1} />
    )))}
  </Svg>
);
export const ListIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <Circle cx={5} cy={7} r={1.8} fill={color} stroke="none" /><Circle cx={5} cy={12} r={1.8} fill={color} stroke="none" /><Circle cx={5} cy={17} r={1.8} fill={color} stroke="none" />
    <Path d="M10 7h10M10 12h10M10 17h7" />
  </Svg>
);
export const SlidersIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
    <Path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><Circle cx={16} cy={7} r={2.2} /><Circle cx={8} cy={17} r={2.2} />
  </Svg>
);
export const PlusIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round"><Path d="M12 5v14M5 12h14" /></Svg>
);
export const CheckIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
);
export const PauseIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Rect x={6.5} y={5} width={3.6} height={14} rx={1.2} /><Rect x={13.9} y={5} width={3.6} height={14} rx={1.2} /></Svg>
);
export const PlayIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M8 5.5v13l10.5-6.5z" /></Svg>
);
export const CloseIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><Path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const UndoIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M9 7L4.5 11.5 9 16" /><Path d="M5 11.5h9a5 5 0 010 10h-2" /></Svg>
);
