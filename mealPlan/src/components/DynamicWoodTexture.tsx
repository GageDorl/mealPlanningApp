import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Rect, G, Path, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  baseColor?: string;
  width?: number;
  height?: number;
}

type GrainLine = {
  d: string;
  strokeWidth: number;
  opacity: number;
  light: boolean; // true = lighter than base, false = darker than base
};

// Deterministic pseudo-random — stable across re-renders, no Math.random().
function rng(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

// Parse a #rrggbb hex color into [r, g, b].
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Shift each channel by delta, clamp to 0–255, return an rgb() string.
function shiftColor(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  const c = (v: number) => Math.min(255, Math.max(0, v + delta));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

type Knot = { x: number; y: number; radius: number; strength: number };

function buildGrainLines(w: number, h: number, count: number): GrainLine[] {
  const lines: GrainLine[] = [];

  // 1–2 knot centres — lines nearby arc around them like contour lines around a hill.
  const knotCount = rng(99) < 0.45 ? 2 : 1;
  const knots: Knot[] = Array.from({ length: knotCount }, (_, k) => ({
    x: w * (0.15 + rng(k * 7 + 50) * 0.7),
    y: h * (0.15 + rng(k * 7 + 51) * 0.7),
    radius: 18 + rng(k * 7 + 52) * 22,
    strength: 28 + rng(k * 7 + 53) * 18,
  }));

  let y = rng(0) * (h / count) * 0.5;

  for (let i = 0; i < count; i++) {
    const r = (s: number) => rng(i * 31 + s);

    // Very long, gentle primary wave — real grain doesn't squiggle tightly.
    const amp   = 0.6 + r(1) * 3.0;
    const freq  = 0.002 + r(4) * 0.005;
    const phase = r(6) * Math.PI * 2;
    // Subtle secondary harmonic for organic imperfection.
    const amp2   = amp * 0.25;
    const freq2  = 0.007 + r(5) * 0.007;
    const phase2 = r(7) * Math.PI * 2;

    // Occasional bold annual-ring line; otherwise thin.
    const strokeWidth = r(8) < 0.10 ? 1.6 + r(9) * 1.0 : 0.35 + r(10) * 0.65;
    const opacity     = strokeWidth > 1.4 ? 0.45 + r(11) * 0.20 : 0.08 + r(12) * 0.22;
    // Alternate light/dark lines — wood grain has both highlight and shadow streaks.
    const light = r(14) < 0.55;

    const points: string[] = [];
    for (let x = 0; x <= w; x += 5) {
      let yVal = y
        + amp  * Math.sin(freq  * x + phase)
        + amp2 * Math.sin(freq2 * x + phase2);

      // Radial knot deflection: push lines away from each knot centre.
      // Direction uses baseline y so the deflection stays geometrically stable.
      for (const knot of knots) {
        const dx      = x - knot.x;
        const dy      = y - knot.y;
        const distSq  = dx * dx + dy * dy;
        const rSq     = knot.radius * knot.radius;
        const falloff = rSq / (distSq + rSq * 0.4);
        const dir     = Math.sign(dy) || 1;
        yVal += falloff * knot.strength * dir * Math.max(0, 1 - distSq / (rSq * 10));
      }

      points.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yVal.toFixed(1)}`);
    }

    lines.push({ d: points.join(' '), strokeWidth, opacity, light });
    y += (h / count) * (0.65 + r(13) * 0.7);
  }
  return lines;
}

export function DynamicWoodTexture({
  baseColor = '#1F1B17',
  width = 400,
  height = 220,
}: Props) {
  const isDark = hexToRgb(baseColor)[0] < 100;
  // Highlight lines are noticeably lighter; shadow lines are noticeably darker.
  // On a dark base the highlight shift is larger so it's visible against the dark field.
  const highlightColor = shiftColor(baseColor, isDark ? 28 : -18);
  const shadowColor    = shiftColor(baseColor, isDark ? -12 : -38);
  const sheenTop       = isDark ? 'rgba(255,220,150,0.05)' : 'rgba(255,255,255,0.20)';
  const sheenBottom    = isDark ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.06)';

  const grainLines = useMemo(() => buildGrainLines(width, height, 32), [width, height]);

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={sheenTop}    stopOpacity="1" />
            <Stop offset="0.5" stopColor="transparent" stopOpacity="0" />
            <Stop offset="1"   stopColor={sheenBottom} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill={baseColor} />

        <G>
          {grainLines.map((line, i) => (
            <Path
              key={i}
              d={line.d}
              stroke={line.light ? highlightColor : shadowColor}
              strokeWidth={line.strokeWidth}
              strokeOpacity={line.opacity}
              fill="none"
            />
          ))}
        </G>

        <Rect x={0} y={0} width={width} height={height} fill="url(#sheen)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
});
