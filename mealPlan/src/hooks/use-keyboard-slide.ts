import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

// Returns an Animated.Value representing translateY for a bottom sheet.
// Negative when keyboard is visible (sheet slides up), 0 when hidden.
// Uses the native driver so it stays in sync with the keyboard animation.
export function useKeyboardSlide() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(translateY, {
          toValue: -e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration : 150,
          useNativeDriver: true,
        }).start();
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(translateY, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration : 150,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [translateY]);

  return translateY;
}
