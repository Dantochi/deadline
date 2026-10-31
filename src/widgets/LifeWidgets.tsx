// Android home-screen widgets (react-native-android-widget). They render from the saved app state, in the app's
// light and dark palettes, and open the app when tapped. Sizes follow the prototype: Small (weeks left),
// Medium (weeks left + whole life in years), Large (weeks left + next deadline + next ten years in weeks),
// and a Tasks list.
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { eventColorMap } from '../lib/events';
import { activeTasks, type State } from '../lib/store';
import { ageYears, info, leftShort, parseBirth, weekEnd, weekNow, weekStart } from '../lib/time';
import { palettes, statusColor, type Palette } from '../theme';

type Hex = `#${string}`;
const hex = (c: string) => c as Hex;
const FONT_UI = 'SchibstedGrotesk_600SemiBold', FONT_NUM = 'Doto_800ExtraBold';

/** Week colours for a range, by the same rules as the life grid (this week, important dates, tasks, lived,
 *  ahead). Everything that doesn't depend on the week (this week, task overlays) is worked out once. */
function weekColors(state: State, p: Palette, first: number, count: number, now = Date.now()) {
  const birth = parseBirth(state.birth), w = weekNow(birth, state.life, now), events = eventColorMap(state);
  const overlays = activeTasks(state).map(t => {
    const st = info(t).st;
    return { s: Math.max(t.start, now), e: t.deadline, r: st === 'red' ? 0 : st === 'amber' ? 1 : 2, c: statusColor(p, st) };
  });
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    const i = first + k;
    if (i === w) { out.push(p.ink); continue; }
    const ev = events.get(i);
    if (ev) { out.push(ev); continue; }
    const s = weekStart(birth, i), e = weekEnd(birth, i);
    if (e <= now) { out.push(p.lived); continue; }
    let best: (typeof overlays)[number] | null = null;
    for (const o of overlays) if (o.s < e && o.e > s && (!best || o.r < best.r)) best = o;
    out.push(best ? best.c : p.ahead);
  }
  return out;
}

function gridSvg(cells: string[], cols: number, width: number) {
  const u = width / cols, gap = Math.max(1, u * 0.2), rows = Math.ceil(cells.length / cols), h = rows * u - gap;
  const rects = cells.map((c, k) =>
    `<rect x="${((k % cols) * u).toFixed(2)}" y="${(Math.floor(k / cols) * u).toFixed(2)}" width="${(u - gap).toFixed(2)}" height="${(u - gap).toFixed(2)}" rx="${(u * 0.18).toFixed(2)}" fill="${c}"/>`).join('');
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">${rects}</svg>`, height: h };
}

const weeksLeft = (s: State) => s.life * 52 - weekNow(parseBirth(s.birth), s.life);
const fmt = (n: number) => n.toLocaleString('en-GB');

function Shell({ p, children, label }: { p: Palette; children: any; label: string }) {
  return (
    <FlexWidget clickAction="OPEN_APP" accessibilityLabel={label}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: hex(p.raise), borderRadius: 22, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
      {children}
    </FlexWidget>
  );
}

const Label = ({ p, text }: { p: Palette; text: string }) => (
  <TextWidget text={text.toUpperCase()} style={{ fontFamily: FONT_UI, fontSize: 11, letterSpacing: 0.12, color: hex(p.dim) }} />
);
const Big = ({ p, n, size }: { p: Palette; n: number; size: number }) => (
  <TextWidget text={fmt(n)} allowFontScaling={false} style={{ fontFamily: FONT_NUM, fontSize: size, color: hex(p.ink) }} />
);

export function SmallWidget({ state, p }: { state: State; p: Palette }) {
  const n = weeksLeft(state);
  return (
    <Shell p={p} label={`${fmt(n)} weeks left`}>
      <Label p={p} text="Weeks left" />
      <Big p={p} n={n} size={34} />
    </Shell>
  );
}

export function MediumWidget({ state, p, width }: { state: State; p: Palette; width: number }) {
  const n = weeksLeft(state), birth = parseBirth(state.birth), age = ageYears(birth);
  const cells = Array.from({ length: state.life }, (_, y) => (y < age ? p.lived : y === age ? p.ink : p.ahead));
  const g = gridSvg(cells, 10, Math.max(60, width - 28));
  return (
    <Shell p={p} label={`${fmt(n)} weeks left. Your life in years.`}>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <Label p={p} text="Weeks left" />
        <Big p={p} n={n} size={30} />
      </FlexWidget>
      <SvgWidget svg={g.svg} style={{ width: Math.max(60, width - 28), height: g.height }} />
    </Shell>
  );
}

export function LargeWidget({ state, p, width }: { state: State; p: Palette; width: number }) {
  const n = weeksLeft(state), birth = parseBirth(state.birth), w = weekNow(birth, state.life);
  const first = Math.floor(w / 52) * 52, total = Math.min(520, state.life * 52 - first);
  const cells = weekColors(state, p, first, total);
  const gw = Math.max(120, width - 28), g = gridSvg(cells, 52, gw);
  const t = activeTasks(state)[0], ti = t ? info(t) : null;
  return (
    <Shell p={p} label={`${fmt(n)} weeks left.${t ? ` Next: ${t.title}, ${leftShort(ti!.left)}.` : ''}`}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <Label p={p} text="Weeks left" />
          <Big p={p} n={n} size={30} />
        </FlexWidget>
        {t && ti ? (
          <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end', flex: 1, marginLeft: 12 }}>
            <TextWidget text="● NEXT" style={{ fontFamily: FONT_UI, fontSize: 11, color: hex(statusColor(p, ti.st, true)) }} />
            <TextWidget text={t.title} maxLines={2} truncate="END" style={{ fontFamily: FONT_UI, fontSize: 14, color: hex(p.ink), textAlign: 'right' }} />
            <TextWidget text={leftShort(ti.left)} style={{ fontFamily: FONT_UI, fontSize: 12, color: hex(p.dim) }} />
          </FlexWidget>
        ) : null}
      </FlexWidget>
      <SvgWidget svg={g.svg} style={{ width: gw, height: g.height }} />
    </Shell>
  );
}

export function TasksWidget({ state, p }: { state: State; p: Palette }) {
  const act = activeTasks(state).slice(0, 4);
  return (
    <Shell p={p} label={act.length ? `Deadlines: ${act.map(t => t.title).join(', ')}` : 'No deadlines yet'}>
      <Label p={p} text="Deadlines" />
      {act.length ? (
        <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', flexGap: 6 }}>
          {act.map(t => {
            const i = info(t), shape = i.st === 'red' ? '▲' : i.st === 'amber' ? '◆' : '●';
            return (
              <FlexWidget key={t.id} style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
                <TextWidget text={state.shapes === false ? '●' : shape} style={{ fontSize: 12, color: hex(statusColor(p, i.st)), marginRight: 8 }} />
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget text={t.title} maxLines={1} truncate="END" style={{ fontFamily: FONT_UI, fontSize: 14, color: hex(p.ink) }} />
                </FlexWidget>
                <TextWidget text={leftShort(i.left)} style={{ fontFamily: FONT_UI, fontSize: 13, color: hex(p.dim), marginLeft: 8 }} />
              </FlexWidget>
            );
          })}
        </FlexWidget>
      ) : <TextWidget text="Add a deadline to see it here." style={{ fontFamily: FONT_UI, fontSize: 14, color: hex(p.dim) }} />}
    </Shell>
  );
}

export const WIDGETS = {
  LifeSmall: SmallWidget, LifeMedium: MediumWidget, LifeLarge: LargeWidget, Tasks: TasksWidget,
} as const;
export type WidgetName = keyof typeof WIDGETS;

/** Light and dark versions; the launcher picks the one matching the phone (or the app's Appearance setting). */
export function renderWidget(name: string, state: State, width: number) {
  const C = WIDGETS[name as WidgetName] ?? SmallWidget;
  const pick = state.appearance === 'light' || state.appearance === 'dark' ? palettes[state.appearance] : null;
  if (pick) return <C state={state} p={pick} width={width} />;
  return { light: <C state={state} p={palettes.light} width={width} />, dark: <C state={state} p={palettes.dark} width={width} /> };
}
