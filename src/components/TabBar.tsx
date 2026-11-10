// The bottom tab bar, drawn by the app so a tab can be moved: press and hold a tab until it lifts, slide it along
// the bar (the others make room), let go to drop it. The order is the same saved `tabOrder` that Settings → Tab
// order edits. A plain tap switches tabs exactly as the standard bar does.
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useReduceMotion } from './Motion';
import { Txt, haptic } from './ui';
import { TAB_TITLES, fixTabOrder, useStore, type TabName } from '../lib/store';
import { F, R, S, usePalette } from '../theme';

/** `order` with the item at `from` moved to `to`. */
export function reorder<T>(order: readonly T[], from: number, to: number): T[] {
  const o = [...order];
  const [x] = o.splice(from, 1);
  o.splice(to, 0, x);
  return o;
}
/** The slot a tab lifted from `start` is over after moving `dx` points, on a bar of `n` slots `w` wide. */
export const slotFor = (start: number, dx: number, w: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(start + dx / w)));
/** How far the tab in slot `j` moves aside while the tab from `from` hovers over `to`. */
export const shiftFor = (j: number, from: number, to: number, w: number) =>
  from < to && j > from && j <= to ? -w : from > to && j >= to && j < from ? w : 0;

type Props = BottomTabBarProps & { icons: Record<TabName, ComponentType<{ color: string }>> };

export function TabBar({ state, emitter, navigateToTab, insets, icons }: Props) {
  const { state: s, update } = useStore();
  const p = usePalette();
  const reduce = useReduceMotion();
  const order = fixTabOrder(s.tabOrder);
  const [width, setWidth] = useState(0);
  const [lifted, setLifted] = useState<TabName | null>(null);
  const offsets = useRef(Object.fromEntries(order.map(n => [n, new Animated.Value(0)])) as Record<TabName, Animated.Value>).current;

  // Live values for the gesture handlers, which are created once.
  const live = useRef({ order, lifted: null as TabName | null, from: 0, target: 0, moving: false, width: 0, reduce });
  live.current = { ...live.current, order, width, reduce };
  const slotW = () => live.current.width / live.current.order.length;
  const move = (v: Animated.Value, to: number) => (live.current.reduce ? v.setValue(to) : Animated.spring(v, { toValue: to, useNativeDriver: true, speed: 20, bounciness: 4 }).start());

  const save = (from: number, to: number) => {
    if (from === to) return;
    const next = reorder(live.current.order, from, to);
    update(x => ({ ...x, tabOrder: next }));
  };
  // After a drop, the positions are reset in the same frame the new order is drawn (no flicker): the dropped tab
  // starts where the finger left it and settles into its new slot.
  const settle = useRef<{ name: TabName; residual: number } | null>(null);
  useLayoutEffect(() => {
    const st = settle.current;
    if (!st) return;
    settle.current = null;
    order.forEach(n => offsets[n].setValue(0));
    offsets[st.name].setValue(st.residual);
    move(offsets[st.name], 0);
  }, [order.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const drop = (dx: number) => {
    const { lifted: name, from, target, order: o } = live.current;
    live.current.lifted = null; live.current.moving = false;
    setLifted(null);
    if (!name) return;
    if (target !== from) {
      settle.current = { name, residual: dx - (target - from) * slotW() };
      save(from, target);
      haptic.ok();
      return;
    }
    o.forEach(n => move(offsets[n], 0));
  };

  const pan = useRef(PanResponder.create({
    // Take the gesture over from the pressed tab only once a tab has lifted.
    onMoveShouldSetPanResponderCapture: () => { if (!live.current.lifted) return false; live.current.moving = true; return true; },
    onMoveShouldSetPanResponder: () => !!live.current.lifted,
    onPanResponderMove: (_, g) => {
      const { lifted: name, from, order: o } = live.current;
      if (!name) return;
      offsets[name].setValue(g.dx);
      const t = slotFor(from, g.dx, slotW(), o.length);
      if (t !== live.current.target) {
        live.current.target = t;
        haptic.tick();
        o.forEach((n, j) => { if (n !== name) move(offsets[n], shiftFor(j, from, t, slotW())); });
      }
    },
    onPanResponderRelease: (_, g) => drop(g.dx),
    onPanResponderTerminate: () => { live.current.target = live.current.from; drop(0); },
  })).current;

  const open = (name: TabName) => {
    const route = state.routes.find(r => r.name === name);
    if (!route) return;
    const focused = state.routes[state.index]?.key === route.key;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigateToTab(route.key);
  };
  const activeName = state.routes[state.index]?.name;

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers} accessibilityRole="tablist"
      style={{ flexDirection: 'row', height: 72 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom, backgroundColor: p.bar,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.glassHi }}>
      {order.map((name, i) => {
        const Icon = icons[name], on = name === activeName, up = name === lifted, color = on ? p.ink : p.dim;
        return (
          <Animated.View key={name} style={{ flex: 1, zIndex: up ? 1 : 0, transform: [{ translateX: offsets[name] }, { scale: up ? 1.08 : 1 }] }}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${TAB_TITLES[name]}, tab, ${i + 1} of ${order.length}`}
              accessibilityHint="Press and hold, then drag to reorder"
              accessibilityActions={[...(i > 0 ? [{ name: 'moveLeft', label: 'Move left' }] : []), ...(i < order.length - 1 ? [{ name: 'moveRight', label: 'Move right' }] : [])]}
              onAccessibilityAction={e => { const to = i + (e.nativeEvent.actionName === 'moveLeft' ? -1 : 1); if (to >= 0 && to < order.length) save(i, to); }}
              onPress={() => open(name)} delayLongPress={380}
              onLongPress={() => { live.current = { ...live.current, lifted: name, from: i, target: i, moving: false }; setLifted(name); haptic.ok(); }}
              // Released without sliding: put the tab back down.
              onPressOut={() => { if (live.current.lifted && !live.current.moving) drop(0); }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: S.s1, marginHorizontal: S.s1, borderRadius: R.md, backgroundColor: up ? p.glassOn : 'transparent' }}>
              <Icon color={color} />
              <Txt allowFontScaling={false} style={{ fontFamily: F.uiSemi, fontSize: 13, lineHeight: 16 }} color={color}>{TAB_TITLES[name]}</Txt>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
