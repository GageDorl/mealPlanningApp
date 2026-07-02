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

  const sheenTopColor    = dark ? 'rgb(255,210,120)' : 'rgb(255,255,255)';
  const sheenTopOpacity  = dark ? 0.06 : 0.22;
  const sheenBotColor    = 'rgb(0,0,0)';
  const sheenBotOpacity  = dark ? 0.28 : 0.08;

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
              <Stop offset="0"    stopColor={sheenTopColor} stopOpacity={sheenTopOpacity} />
              <Stop offset="0.45" stopColor={sheenTopColor} stopOpacity={0} />
              <Stop offset="0.55" stopColor={sheenBotColor} stopOpacity={0} />
              <Stop offset="1"    stopColor={sheenBotColor} stopOpacity={sheenBotOpacity} />
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
  } as ImageStyle,
});
