import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
}

export function Toggle({ value, onValueChange, disabled, activeColor = Colors.accent }: ToggleProps) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.track,
        { backgroundColor: value ? activeColor : '#D1D1D6' },
        disabled && styles.disabled,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 51,
    height: 31,
    borderRadius: 15.5,
    justifyContent: 'center',
    padding: 2,
  } as ViewStyle,
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  thumbOff: {
    alignSelf: 'flex-start',
  } as ViewStyle,
  thumbOn: {
    alignSelf: 'flex-end',
  } as ViewStyle,
  disabled: {
    opacity: 0.4,
  } as ViewStyle,
});
