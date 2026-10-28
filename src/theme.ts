// Design tokens carried over from the prototype. Status colours are fixed (never dynamic colour)
// so they stay distinct for red-green colour blindness.
import { useColorScheme } from 'react-native';

export type Status = 'green' | 'amber' | 'red' | 'paused' | 'done';

const dark = {
  bg: '#0B0C0E', raise: '#15171A', raise2: '#1F2226', line: '#2A2D32',
  ink: '#F1F1EC', dim: '#8C9097', lived: '#4B5058', ahead: '#1B1E22',
  red: '#FF6B3D', amber: '#FFCB47', green: '#3CCFB0',
  redInk: '#FF7A50', amberInk: '#FFCB47', greenInk: '#3CCFB0',
  scrim: 'rgba(0,0,0,0.62)',
};
const light: typeof dark = {
  bg: '#F3F4F5', raise: '#FFFFFF', raise2: '#E8EAEC', line: '#DADDE1',
  ink: '#0F1113', dim: '#6A6F77', lived: '#A9AEB6', ahead: '#E2E4E7',
  red: '#9F1D12', amber: '#A97800', green: '#0E8A7A',
  redInk: '#9F1D12', amberInk: '#845600', greenInk: '#0A6E61',
  scrim: 'rgba(15,17,19,0.38)',
};
export type Palette = typeof dark;
export const palettes = { dark, light };

export function usePalette(): Palette {
  return useColorScheme() === 'light' ? light : dark;
}

export function statusColor(p: Palette, st: Status, ink = false) {
  if (st === 'paused' || st === 'done') return p.dim;
  return ink ? p[`${st}Ink`] : p[st];
}

// 8-point spacing, radius scale, button sizes (icon = label line height, 8px gap).
export const S = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64 };
export const R = { sm: 10, md: 14, lg: 20, xl: 28 };
export const BTN = { m: 48, l: 56 };

export const F = {
  ui: 'SchibstedGrotesk_400Regular',
  uiMedium: 'SchibstedGrotesk_500Medium',
  uiSemi: 'SchibstedGrotesk_600SemiBold',
  uiBold: 'SchibstedGrotesk_700Bold',
  uiHeavy: 'SchibstedGrotesk_800ExtraBold',
  dot: 'Doto_800ExtraBold',
};
