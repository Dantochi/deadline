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
export const QuoteIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M4 11.5C4 7.9 6 5.6 9.3 5l.6 1.6C8 7.2 7.1 8.4 7 10h3v8H4zm10 0c0-3.6 2-5.9 5.3-6.5l.6 1.6c-1.9.6-2.8 1.8-2.9 3.4h3v8h-6z" /></Svg>
);
export const ChevronIcon = ({ size = 22, color, left }: P & { left?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} /></Svg>
);
export const HeartIcon = ({ size = 22, color, filled }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.9} strokeLinejoin="round"><Path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.3a4.3 4.3 0 017.5 2.5C19.5 15.4 12 20 12 20z" /></Svg>
);
export const BookIcon = ({ size = 20, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5v13c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z" /><Path d="M12 6v13" /></Svg>
);
export const ArrowOutIcon = ({ size = 18, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"><Path d="M7 17L17 7M9 7h8v8" /></Svg>
);
export const CalendarIcon = ({ size = 24, color }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3.5} y={5} width={17} height={15.5} rx={3} /><Path d="M3.5 10h17M8 3v4M16 3v4" />
    <Rect x={7} y={13} width={3} height={3} rx={0.6} fill={color} stroke="none" /><Rect x={14} y={13} width={3} height={3} rx={0.6} fill={color} stroke="none" opacity={0.4} />
  </Svg>
);
