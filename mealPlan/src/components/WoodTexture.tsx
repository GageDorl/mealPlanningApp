import { ImageBackground, StyleSheet, View, type ViewStyle, type ImageStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LIGHT_TEXTURE = require('@/../assets/images/light_mode.png');
const DARK_TEXTURE  = require('@/../assets/images/dark_mode.png');

interface Props {
  width: number;
  height: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function WoodTexture({ width, height, style, children }: Props) {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const sheenTop    = dark ? 'rgba(255,210,120,0.06)' : 'rgba(255,255,255,0.22)';
  const sheenBottom = dark ? 'rgba(0,0,0,0.28)'       : 'rgba(0,0,0,0.08)';

  return (
    <ImageBackground
      source={dark ? DARK_TEXTURE : LIGHT_TEXTURE}
      style={[styles.container, { width, height }, style]}
      imageStyle={styles.image}
      resizeMode="cover"
    >
      {/* Lacquer sheen gradient — top highlight + bottom shadow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0"    stopColor={sheenTop}    stopOpacity="1" />
              <Stop offset="0.45" stopColor="transparent" stopOpacity="0" />
              <Stop offset="1"    stopColor={sheenBottom} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#sheen)" />
        </Svg>
      </View>

      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  } as ViewStyle,
  image: {
    opacity: 1,
    // Anchor to bottom-center — grain reads from the floor up
    top: undefined,
    bottom: 0,
  } as ImageStyle,
});
