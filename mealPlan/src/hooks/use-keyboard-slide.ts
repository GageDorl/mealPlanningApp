import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Returns an Animated.Value representing translateY for a bottom sheet.
// Negative when keyboard is visible (sheet slides up), 0 when hidden.
// Uses the native driver so it stays in sync with the keyboard animation.
export function useKeyboardSlide() {
  const translateY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const bottomInsetRef = useRef(insets.bottom);
  bottomInsetRef.current = insets.bottom;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // e.endCoordinates.height is measured from the bottom of the screen, which already
        // includes the bottom safe-area inset (nav bar / home indicator) that the sheet's own
        // bottom padding accounts for — subtract it so the sheet doesn't slide up further than
        // the keyboard actually requires. Clamp at 0 so a smaller-than-inset keyboard height
        // (some devices/orientations) can't flip this positive and slide the sheet down instead.
        Animated.timing(translateY, {
          toValue: -Math.max(0, e.endCoordinates.height - bottomInsetRef.current),
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
